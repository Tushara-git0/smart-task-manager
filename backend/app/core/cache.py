import json
from typing import Any, Optional
from app.core.config import settings

try:
    import redis as _redis
    _client = _redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    _client.ping()
    redis_client = _client
except Exception:
    import fakeredis
    redis_client = fakeredis.FakeRedis(decode_responses=True)

def cache_get(key: str) -> Optional[Any]:
    try:
        value = redis_client.get(key)
        return json.loads(value) if value else None
    except Exception:
        return None

def cache_set(key: str, value: Any, expire: int = 300) -> bool:
    try:
        redis_client.setex(key, expire, json.dumps(value, default=str))
        return True
    except Exception:
        return False

def cache_delete(key: str) -> bool:
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False

def cache_delete_pattern(pattern: str) -> bool:
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
        return True
    except Exception:
        return False
