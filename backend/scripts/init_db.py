"""Crea las tablas en la BD. Idempotente: usa create_all."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.database import engine, Base
import models  # noqa: F401  (registra todas las tablas)


async def main():
    print("Creando tablas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tablas creadas (o ya existian).")


if __name__ == "__main__":
    asyncio.run(main())
