"""AI Coach endpoint: lee MDs de screens/ y pide tips contextuales a Gemini."""
from pathlib import Path
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import json
import hashlib
import time

from core.database import get_db
from core.security import get_current_user
from models.user import User
from services.gemini import _generate
from services.coach_context import enrich_context

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
async def get_coach(
    payload: AICoachRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    manual = _load_screen_manual(payload.screen)
    if not manual:
        return AICoachResponse()

    # Enriquecer el contexto con data cross-screen (leads WA pendientes, deals
    # estancados, agentes online, ranking del equipo, visitas proximas, etc.)
    enriched_context = await enrich_context(db, user, payload.screen, payload.context)

    # El cache key se calcula sobre el contexto enriquecido para que si cambia
    # algo "global" (ej: alguien responde un lead WA), el coach se refresque.
    key = _cache_key(payload.screen, enriched_context)
    now = time.time()
    if key in _cache:
        ts, cached = _cache[key]
        if now - ts < _CACHE_TTL:
            return cached

    context_json = json.dumps(enriched_context, ensure_ascii=False, default=str, indent=2)
    prompt = (
        f"{manual}\n\n"
        f"---\n\n"
        f"CONTEXTO ACTUAL (datos reales en JSON, incluye `_global` y `_personal` "
        f"con señales cross-screen como leads WhatsApp sin responder, deals estancados, "
        f"ranking del equipo, agentes online, visitas próximas):\n"
        f"```json\n{context_json}\n```\n\n"
        f"INSTRUCCION GENERAL:\n"
        f"Generá los 3 widgets (hot_tip, next_action, streak) priorizando SIEMPRE las\n"
        f"señales más urgentes que veas en el contexto. Si hay un lead caliente sin\n"
        f"responder hace +4h en `_global.leads_wa_sin_responder_4h`, ESO es el hot_tip\n"
        f"aunque la pantalla actual sea otra. Cross-screen tips son OK y deseables.\n\n"
        f'Respondé SOLO con JSON shape:\n'
        f'{{"hot_tip":{{"title":"...","body":"...","accent":"gold|flame|ok|blue",'
        f'"cta_label":"...","cta_action":{{...}}}},'
        f'"next_action":{{...}},"streak":{{...}}}}.\n'
        f"Si algún widget no aplica, usar null. NUNCA inventes datos que no estén en el "
        f"contexto enriquecido. Si no hay nada caliente, dar un tip genérico del módulo."
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
