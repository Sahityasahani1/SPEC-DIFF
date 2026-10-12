"""Distributed Redis Caching Service with Resilient In-Memory Fallback."""
import json
import time
import hashlib
import logging
from typing import Optional, Dict, Any
import redis.asyncio as aioredis
from app.config import REDIS_URL, CACHE_TTL_SECONDS
from app.schemas import RecommendationRequest

logger = logging.getLogger("specdiff.cache")

class RecommendationCacheService:
    def __init__(self):
        self.redis_url = REDIS_URL
        self.ttl = CACHE_TTL_SECONDS
        self._redis_client: Optional[aioredis.Redis] = None
        self._in_memory_cache: Dict[str, Dict[str, Any]] = {}
        self._connected = False
        self._last_redis_attempt = 0.0
        self._redis_retry_interval = 60.0  # Throttle connection attempts to 60s

    async def get_client(self) -> Optional[aioredis.Redis]:
        if self._redis_client is not None:
            return self._redis_client

        now = time.time()
        if now - self._last_redis_attempt < self._redis_retry_interval:
            return None

        self._last_redis_attempt = now
        try:
            client = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=0.5
            )
            await client.ping()
            self._redis_client = client
            self._connected = True
            logger.info(f"[CACHE] Connected to Redis at {self.redis_url}")
            return self._redis_client
        except Exception as e:
            logger.debug(f"[CACHE] Redis connection unavailable ({e}). Using in-memory cache fallback.")
            self._connected = False
            self._redis_client = None
            return None

    def generate_key(self, request: RecommendationRequest) -> str:
        """
        Creates a deterministic SHA-256 cache key from sanitized request parameters.
        Normalizes free-text query to maximize cache hit rates for equivalent prompts.
        """
        norm_query = " ".join(request.use_case.lower().strip().split())
        key_content = (
            f"cat={request.category}|budget={request.max_budget}|ram={request.min_ram_gb}|"
            f"ssd={request.min_storage_gb}|brand={request.brand or 'any'}|"
            f"prio={request.priority}|q={norm_query}"
        )
        hash_digest = hashlib.sha256(key_content.encode("utf-8")).hexdigest()
        return f"specdiff:rec:{hash_digest}"

    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        # 1. Try Redis if connected
        try:
            client = await self.get_client()
            if client:
                raw_data = await client.get(key)
                if raw_data:
                    return json.loads(raw_data)
        except Exception as e:
            logger.debug(f"[CACHE] Redis GET error for {key}: {e}")

        # 2. Fallback to in-memory cache
        item = self._in_memory_cache.get(key)
        if item:
            if time.time() < item["expires_at"]:
                return item["data"]
            else:
                self._in_memory_cache.pop(key, None)

        return None

    async def set(self, key: str, data: Dict[str, Any], ttl: Optional[int] = None, ttl_seconds: Optional[int] = None) -> None:
        effective_ttl = ttl or ttl_seconds or self.ttl
        serialized = json.dumps(data)

        # 1. Try Redis
        try:
            client = await self.get_client()
            if client:
                await client.setex(key, effective_ttl, serialized)
        except Exception as e:
            logger.debug(f"[CACHE] Redis SET error for {key}: {e}")

        # 2. Update in-memory fallback with bounded capacity
        max_items = 1000
        if len(self._in_memory_cache) >= max_items:
            now = time.time()
            expired = [k for k, v in self._in_memory_cache.items() if now >= v.get("expires_at", 0)]
            for k in expired:
                self._in_memory_cache.pop(k, None)
            if len(self._in_memory_cache) >= max_items:
                for k in list(self._in_memory_cache.keys())[:100]:
                    self._in_memory_cache.pop(k, None)

        self._in_memory_cache[key] = {
            "data": data,
            "expires_at": time.time() + effective_ttl
        }

    async def invalidate_catalog_cache(self) -> int:
        """Flushes recommendation cache keys when catalog prices or stock change."""
        count = 0
        # In-memory flush
        keys_to_delete = [k for k in self._in_memory_cache if k.startswith("specdiff:rec:")]
        for k in keys_to_delete:
            self._in_memory_cache.pop(k, None)
            count += 1

        # Redis pattern flush
        try:
            client = await self.get_client()
            if client:
                cursor = 0
                while True:
                    cursor, keys = await client.scan(cursor=cursor, match="specdiff:rec:*", count=100)
                    if keys:
                        await client.delete(*keys)
                        count += len(keys)
                    if cursor == 0:
                        break
        except Exception as e:
            logger.debug(f"[CACHE] Redis catalog cache flush error: {e}")

        logger.info(f"[CACHE] Invalidated {count} recommendation cache entries.")
        return count

    def clear(self):
        """Synchronously clears local in-memory cache."""
        self._in_memory_cache.clear()

cache_service = RecommendationCacheService()
