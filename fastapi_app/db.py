"""Motor (async) MongoDB client for FynxAI FastAPI service."""
from __future__ import annotations

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def init_db() -> None:
    global _client, _db
    uri = os.environ["MONGO_URI"]
    _client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=10_000)
    await _client.admin.command("ping")  # verify connection on startup
    _db = _client.get_default_database()
    print("✅ Motor MongoDB connected")


async def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("DB not initialised — call init_db() first")
    return _db


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
