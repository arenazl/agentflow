"""Text-to-Speech via ElevenLabs + subida a Cloudinary.

Modulo reutilizable: cualquier flujo que necesite generar audio desde texto
(bot WhatsApp, mensajes manuales del vendedor, recordatorios automaticos, etc.)
puede usar `synthesize_to_cloudinary(text, voice_id?)` y obtiene una URL publica
de Cloudinary lista para enviar via Baileys u otro canal.

Flujo:
1. POST a ElevenLabs /v1/text-to-speech/{voice_id} con el texto
2. ElevenLabs devuelve un MP3 en bytes
3. Subimos a Cloudinary (resource_type=video, que abarca audio)
4. Devolvemos URL https publica

Si falla cualquier paso devolvemos None — el caller decide caer a texto.
"""
from typing import Optional
import httpx
import cloudinary
import cloudinary.uploader

from core.config import settings


ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"


def _ensure_cloudinary_config() -> None:
    """Idempotente: configura Cloudinary la primera vez."""
    if cloudinary.config().cloud_name:
        return
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


async def synthesize_mp3(text: str, voice_id: Optional[str] = None) -> Optional[bytes]:
    """Genera un MP3 desde texto via ElevenLabs y devuelve los bytes.

    Devuelve None si:
    - No esta configurada la API key
    - Falla la llamada a ElevenLabs (rate limit, voz invalida, etc.)

    Args:
        text: el contenido a sintetizar (max ~5000 chars, ElevenLabs lo trunca).
        voice_id: ID de voz; si es None usa ELEVENLABS_DEFAULT_VOICE_ID.
    """
    if not settings.ELEVENLABS_API_KEY:
        print("[tts] ELEVENLABS_API_KEY no configurada")
        return None
    vid = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
    if not vid:
        print("[tts] No hay voice_id (parametro ni default)")
        return None

    # Limpiamos texto: ElevenLabs no entiende markdown ni emojis bien.
    # No removemos puntuacion porque influye en la prosodia (pausas, entonacion).
    clean = (text or "").strip()
    if not clean:
        return None
    if len(clean) > 4500:
        clean = clean[:4500]

    payload = {
        "text": clean,
        "model_id": settings.ELEVENLABS_MODEL,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.3,
            "use_speaker_boost": True,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{ELEVENLABS_BASE}/text-to-speech/{vid}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            r.raise_for_status()
            return r.content
    except httpx.HTTPStatusError as e:
        body_preview = ""
        try:
            body_preview = e.response.text[:200]
        except Exception:
            pass
        print(f"[tts] elevenlabs HTTP {e.response.status_code}: {body_preview}")
        return None
    except Exception as e:
        print(f"[tts] elevenlabs error: {e}")
        return None


def _upload_to_cloudinary(audio_bytes: bytes, public_id_prefix: str = "tts") -> Optional[str]:
    """Sube los bytes de audio a Cloudinary y devuelve la URL https.

    Cloudinary maneja audio bajo resource_type='video'.
    """
    _ensure_cloudinary_config()
    try:
        result = cloudinary.uploader.upload(
            audio_bytes,
            resource_type="video",
            folder="agentflow/tts",
            public_id=f"{public_id_prefix}_{int(_ts())}",
            format="mp3",
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"[tts] cloudinary upload error: {e}")
        return None


def _ts() -> float:
    import time
    return time.time() * 1000


async def synthesize_to_cloudinary(
    text: str,
    voice_id: Optional[str] = None,
    prefix: str = "tts",
) -> Optional[str]:
    """High-level helper: texto -> MP3 -> Cloudinary -> URL publica.

    Devuelve la URL secure_url o None si falla cualquier paso.
    """
    audio = await synthesize_mp3(text, voice_id=voice_id)
    if not audio:
        return None
    return _upload_to_cloudinary(audio, public_id_prefix=prefix)
