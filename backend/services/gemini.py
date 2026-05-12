"""Servicio Gemini para descripciones y lead scoring."""
import httpx
import json
from typing import Optional, Dict, List

from core.config import settings


async def _generate(prompt: str, json_mode: bool = True, max_tokens: int = 4000) -> Optional[Dict]:
    if not settings.GEMINI_API_KEY:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    cfg = {"temperature": 0.2, "maxOutputTokens": max_tokens}
    if json_mode:
        cfg["responseMimeType"] = "application/json"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": cfg,
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text) if json_mode else {"text": text}
    except Exception as e:
        print(f"[gemini] error: {e}")
        return None


async def describir_propiedad(p: Dict) -> Optional[str]:
    prompt = (
        "Sos un copywriter inmobiliario. Generame una descripcion comercial atractiva "
        "(120-180 palabras, en castellano rioplatense, sin emojis) para esta propiedad:\n"
        f"{json.dumps(p, ensure_ascii=False)}\n"
        'Devolveme JSON: {"descripcion": "..."}'
    )
    r = await _generate(prompt, json_mode=True)
    return r.get("descripcion") if r else None


async def clasificar_temperatura(notas: str, dias_sin_contacto: int) -> Optional[str]:
    """Devuelve 'caliente' | 'tibio' | 'frio'."""
    prompt = (
        "Sos un analista de leads inmobiliarios. Clasifica al lead segun sus notas y "
        f"sus dias sin contacto ({dias_sin_contacto} dias). Respuesta solo una de: "
        '"caliente", "tibio", "frio". '
        f"Notas: {notas}\n"
        'Devolveme JSON: {"temperatura": "..."}'
    )
    r = await _generate(prompt, json_mode=True)
    return r.get("temperatura") if r else None
