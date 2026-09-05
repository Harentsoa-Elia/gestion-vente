import asyncio
from sqlalchemy import text
from app.database import engine


async def main():
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        )
        for row in result:
            print(row[0])


asyncio.run(main())