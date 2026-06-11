import asyncio
import logging
from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError
from app.database import engine, Base, async_session
from app.models import User, UserRole
from app.auth import hash_password
from app.config import ADMIN_USERNAME, ADMIN_PASSWORD

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("seed")


async def wait_for_db(retries=30, delay=2):
    for i in range(retries):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return
        except OperationalError:
            log.info(f"Waiting for database... ({i + 1}/{retries})")
            await asyncio.sleep(delay)
    raise RuntimeError("Database not available")


async def seed():
    await wait_for_db()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        result = await session.execute(select(User).where(User.role == UserRole.ADMIN))
        if not result.scalar_one_or_none():
            admin = User(
                username=ADMIN_USERNAME,
                email=f"{ADMIN_USERNAME}@assetmanager.local",
                password_hash=hash_password(ADMIN_PASSWORD),
                role=UserRole.ADMIN,
            )
            session.add(admin)
            await session.commit()
            log.info(f"Admin user created: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
        else:
            log.info("Admin user already exists")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
