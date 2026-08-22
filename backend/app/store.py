"""Unified document store with MongoDB + in-memory demo fallback.

A Mongo outage must never crash a demo. Reads and writes keep working
against a process-local store when the database is unreachable.
"""

from __future__ import annotations

import copy
import logging
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger("soulcare.store")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _match(doc: dict, query: dict) -> bool:
    for key, expected in query.items():
        if key == "$or":
            if not any(_match(doc, clause) for clause in expected):
                return False
            continue
        if key == "$in":
            continue
        value = doc.get(key)
        if isinstance(expected, dict):
            if "$in" in expected and value not in expected["$in"]:
                return False
            if "$gte" in expected and (value is None or value < expected["$gte"]):
                return False
            if "$lte" in expected and (value is None or value > expected["$lte"]):
                return False
            if "$ne" in expected and value == expected["$ne"]:
                return False
        elif value != expected:
            return False
    return True


class MemoryCollection:
    def __init__(self) -> None:
        self.docs: list[dict] = []

    def _clone(self, doc: dict) -> dict:
        return copy.deepcopy(doc)

    async def insert_one(self, doc: dict) -> None:
        self.docs.append(self._clone(doc))

    async def insert_many(self, docs: list[dict]) -> None:
        self.docs.extend(self._clone(d) for d in docs)

    async def find_one(self, query: dict) -> dict | None:
        for doc in self.docs:
            if _match(doc, query):
                return self._clone(doc)
        return None

    async def find(
        self,
        query: dict | None = None,
        sort: list[tuple[str, int]] | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        query = query or {}
        rows = [self._clone(d) for d in self.docs if _match(d, query)]
        if sort:
            for key, direction in reversed(sort):
                rows.sort(key=lambda d: (d.get(key) is None, d.get(key)), reverse=direction < 0)
        if limit is not None:
            rows = rows[:limit]
        return rows

    async def update_one(self, query: dict, update: dict) -> bool:
        for doc in self.docs:
            if _match(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        doc[k] = (doc.get(k) or 0) + v
                if "$push" in update:
                    for k, v in update["$push"].items():
                        doc.setdefault(k, []).append(v)
                return True
        return False

    async def count(self, query: dict | None = None) -> int:
        query = query or {}
        return sum(1 for d in self.docs if _match(d, query))

    async def delete_many(self, query: dict) -> int:
        before = len(self.docs)
        self.docs = [d for d in self.docs if not _match(d, query)]
        return before - len(self.docs)


class MemoryStore:
    def __init__(self) -> None:
        self._cols: dict[str, MemoryCollection] = {}

    def __getitem__(self, name: str) -> MemoryCollection:
        if name not in self._cols:
            self._cols[name] = MemoryCollection()
        return self._cols[name]


class MongoCollectionAdapter:
    def __init__(self, collection: Any) -> None:
        self.collection = collection

    async def insert_one(self, doc: dict) -> None:
        await self.collection.insert_one(doc)

    async def insert_many(self, docs: list[dict]) -> None:
        if docs:
            await self.collection.insert_many(docs)

    async def find_one(self, query: dict) -> dict | None:
        return await self.collection.find_one(query)

    async def find(
        self,
        query: dict | None = None,
        sort: list[tuple[str, int]] | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        cursor = self.collection.find(query or {})
        if sort:
            cursor = cursor.sort(sort)
        if limit is not None:
            cursor = cursor.limit(limit)
        return await cursor.to_list(length=limit or 500)

    async def update_one(self, query: dict, update: dict) -> bool:
        result = await self.collection.update_one(query, update)
        return result.modified_count > 0 or result.matched_count > 0

    async def count(self, query: dict | None = None) -> int:
        return await self.collection.count_documents(query or {})

    async def delete_many(self, query: dict) -> int:
        result = await self.collection.delete_many(query)
        return result.deleted_count


class Store:
    def __init__(self) -> None:
        self.mongo_ready = False
        self.memory = MemoryStore()
        self._client: AsyncIOMotorClient | None = None
        self._db: AsyncIOMotorDatabase | None = None
        self.using_fallback = True

    def collection(self, name: str):
        if self.mongo_ready and self._db is not None:
            return MongoCollectionAdapter(self._db[name])
        return self.memory[name]

    async def connect(self) -> None:
        settings = get_settings()
        try:
            self._client = AsyncIOMotorClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=2500,
            )
            await self._client.admin.command("ping")
            self._db = self._client[settings.mongodb_db]
            self.mongo_ready = True
            self.using_fallback = False
            logger.info("MongoDB connected")
        except Exception as exc:  # noqa: BLE001 — demo must survive any DB failure
            self.mongo_ready = False
            self.using_fallback = True
            self._client = None
            self._db = None
            logger.warning("MongoDB unavailable, using in-memory fallback: %s", exc)

    async def close(self) -> None:
        if self._client is not None:
            self._client.close()


store = Store()
