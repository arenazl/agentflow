"""Limpia duplicados de dmo_logs (mismo vendedor+bloque+fecha)."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main():
    async with engine.begin() as conn:
        # Borra duplicados manteniendo el de menor id
        await conn.execute(text("""
            DELETE d1 FROM dmo_logs d1
            INNER JOIN dmo_logs d2
            WHERE d1.id > d2.id
              AND d1.vendedor_id = d2.vendedor_id
              AND d1.bloque_id = d2.bloque_id
              AND d1.fecha = d2.fecha
        """))
        r = await conn.execute(text("SELECT COUNT(*) FROM dmo_logs"))
        total = r.scalar()
        print(f"dmo_logs sin duplicados: {total}")


if __name__ == "__main__":
    asyncio.run(main())
