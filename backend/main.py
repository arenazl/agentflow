import sys
import asyncio

# Windows: aiomysql + SSL requiere SelectorEventLoop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api import (
    auth, users, clientes, propiedades, visitas, autorizaciones, pipeline,
    dmo, dashboard, ai_coach, coaches, dmo_templates, dmo_assignments, whatsapp,
    bot_config, baileys_auth, push,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(clientes.router, prefix="/api/clientes", tags=["clientes"])
app.include_router(propiedades.router, prefix="/api/propiedades", tags=["propiedades"])
app.include_router(visitas.router, prefix="/api/visitas", tags=["visitas"])
app.include_router(autorizaciones.router, prefix="/api/autorizaciones", tags=["autorizaciones"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
app.include_router(dmo.router, prefix="/api/dmo", tags=["dmo"])
app.include_router(coaches.router, prefix="/api/coaches", tags=["coaches"])
app.include_router(dmo_templates.router, prefix="/api/dmo-templates", tags=["dmo-templates"])
app.include_router(dmo_assignments.router, prefix="/api/dmo-assignments", tags=["dmo-assignments"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(ai_coach.router, prefix="/api/ai-coach", tags=["ai-coach"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["whatsapp"])
app.include_router(bot_config.router, prefix="/api/bot-config", tags=["bot-config"])
app.include_router(baileys_auth.router, prefix="/api/baileys-auth", tags=["baileys-auth"])
app.include_router(push.router, prefix="/api/push", tags=["push"])
