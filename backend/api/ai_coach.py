"""AI Coach endpoint: lee MDs de screens/ y pide tips contextuales a Gemini."""
from pathlib import Path
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import hashlib
import time

from core.security import get_current_user
from models.user import User
from services.gemini import _generate

router = APIRouter()

# Buscar primero en el repo del backend (deploy), fallback al monorepo local
_CANDIDATE_DIRS = [
    Path(__file__).parent.parent / "screens",
    Path(r"d:\Code\APP_GUIDE\screens"),
]


def _resolve_screen_file(screen: str) -> Optional[Path]:
    for base in _CANDIDATE_DIRS:
        f = base / f"{screen}.md"
        if f.exists():
            return f
    return None


def _all_available_screens() -> Dict[str, str]:
    """Mapa screen_id -> source dir. Override de proyecto gana sobre global."""
    seen: Dict[str, str] = {}
    for base in _CANDIDATE_DIRS:
        if not base.exists():
            continue
        for f in base.glob("*.md"):
            if f.stem.startswith("_"):
                continue
            seen.setdefault(f.stem, str(base))
    return seen


class AICoachRequest(BaseModel):
    screen: str
    context: Dict[str, Any] = {}


class AICoachWidget(BaseModel):
    title: str
    body: str
    accent: str = "gold"
    cta_label: Optional[str] = None
    cta_action: Optional[Dict[str, Any]] = None


class AICoachResponse(BaseModel):
    hot_tip: Optional[AICoachWidget] = None
    next_action: Optional[AICoachWidget] = None
    streak: Optional[AICoachWidget] = None


def _load_screen_manual(screen: str) -> Optional[str]:
    f = _resolve_screen_file(screen)
    if not f:
        return None
    return f.read_text(encoding="utf-8")


# Cache simple por screen+contextHash, TTL 5min
_cache: Dict[str, tuple[float, AICoachResponse]] = {}
_CACHE_TTL = 5 * 60


def _cache_key(screen: str, context: Dict[str, Any]) -> str:
    raw = json.dumps({"s": screen, "c": context}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


@router.post("/", response_model=AICoachResponse)
async def get_coach(payload: AICoachRequest, user: User = Depends(get_current_user)):
    manual = _load_screen_manual(payload.screen)
    if not manual:
        return AICoachResponse()

    key = _cache_key(payload.screen, payload.context)
    now = time.time()
    if key in _cache:
        ts, cached = _cache[key]
        if now - ts < _CACHE_TTL:
            return cached

    context_json = json.dumps(payload.context, ensure_ascii=False, default=str, indent=2)
    prompt = (
        f"{manual}\n\n"
        f"---\n\n"
        f"CONTEXTO ACTUAL (datos reales de la pantalla, en JSON):\n"
        f"```json\n{context_json}\n```\n\n"
        f"Generá los 3 widgets siguiendo EXACTAMENTE el shape del 'Ejemplo de prompt resuelto' del manual.\n"
        f'Respondé SOLO con JSON shape:\n'
        f'{{"hot_tip":{{"title":"...","body":"...","accent":"gold|flame|ok|blue",'
        f'"cta_label":"...","cta_action":{{...}}}},'
        f'"next_action":{{...}},"streak":{{...}}}}.\n'
        f"Si algún widget no aplica, usar null en lugar de objeto. "
        f"NUNCA inventes datos que no estén en el contexto. "
        f"Si no hay datos calientes, dar un tip genérico del módulo (ver manual)."
    )

    data = await _generate(prompt, json_mode=True, max_tokens=4000)
    if not data:
        empty = AICoachResponse()
        _cache[key] = (now, empty)
        return empty

    try:
        resp = AICoachResponse(**data)
    except Exception as e:
        print(f"[ai_coach] respuesta invalida de Gemini: {e}  data={data}")
        resp = AICoachResponse()

    _cache[key] = (now, resp)
    return resp


@router.get("/health")
async def ai_coach_health():
    available = _all_available_screens()
    return {
        "ok": len(available) > 0,
        "dirs_tried": [str(p) for p in _CANDIDATE_DIRS],
        "available_screens": available,
    }
