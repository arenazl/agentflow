"""Borra y recrea las tablas DMO + relacionadas para alinear con los modelos nuevos.

Borra en orden de FK descendente para no romper integridad.
NO TOCA users/clientes/propiedades/visitas/pipeline/autorizaciones.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine, Base
import models  # registra todas las tablas  # noqa: F401


TABLES_IN_ORDER_DESC = [
    "dmo_logs",
    "vendedor_dmo_assignments",
    "dmo_bloques",
    "dmo_templates",
    "coaches",
]


async def main():
    async with engine.begin() as conn:
        await conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for t in TABLES_IN_ORDER_DESC:
            try:
                await conn.execute(text(f"DROP TABLE IF EXISTS {t}"))
                print(f"  DROP {t}")
            except Exception as e:
                print(f"  WARN dropping {t}: {e}")
        await conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    print("Recreando tablas desde los modelos actuales...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tablas DMO recreadas con el schema nuevo.")


if __name__ == "__main__":
    asyncio.run(main())
