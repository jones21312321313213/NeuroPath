import hashlib
import logging
import math
import os
import re
from typing import List
import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class EmbeddingService:
    EMBEDDING_MODEL = 'text-embedding-3-small'
    DIMENSIONS = 1536
    OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'
    CACHE_TTL = 7 * 24 * 60 * 60  # 7 days in seconds

    @classmethod
    def _normalize_text(cls, text: str) -> str:
        """Normalizes text by lowercasing and stripping redundant whitespace."""
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)
        return text

    @classmethod
    def _cache_key(cls, domain: str, normalized_text: str) -> str:
        """Generates an MD5 cache key for domain-qualified normalized text."""
        norm_domain = (domain or 'General').strip().lower()
        raw_key = f"emb:{norm_domain}:{normalized_text}"
        digest = hashlib.md5(raw_key.encode('utf-8')).hexdigest()
        return f"neuropath_rag_emb_{digest}"

    @classmethod
    def _deterministic_mock_embedding(cls, text: str) -> List[float]:
        """
        Generates a deterministic 1536-dimensional unit vector based on sha256 hash.
        Guarantees non-zero, L2-normalized vector reproducible across offline tests.
        """
        digest = hashlib.sha256(text.encode('utf-8')).digest()
        # Seed pseudo-random values deterministically across 1536 floats
        raw_vec = []
        seed = int.from_bytes(digest[:8], byteorder='big')
        for i in range(cls.DIMENSIONS):
            seed = (seed * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
            val = ((seed >> 33) - (1 << 30)) / (1 << 30)
            raw_vec.append(val)

        # L2 normalize
        magnitude = math.sqrt(sum(x * x for x in raw_vec)) or 1.0
        return [round(x / magnitude, 7) for x in raw_vec]

    @classmethod
    def get_embedding(cls, text: str, domain: str = "General") -> List[float]:
        """
        Retrieves embedding for a single text, utilizing cache, OpenAI API,
        or deterministic mock fallback.
        """
        if not text:
            return [0.0] * cls.DIMENSIONS

        norm_text = cls._normalize_text(text)
        cache_key = cls._cache_key(domain, norm_text)

        # 1. Check in-memory/Redis cache
        try:
            cached_val = cache.get(cache_key)
            if cached_val and len(cached_val) == cls.DIMENSIONS:
                return cached_val
        except Exception as e:
            logger.debug("Cache lookup error for embedding: %s", e)

        # 2. Call OpenAI API if API key is present
        api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.environ.get('OPENAI_API_KEY', '')
        if api_key and api_key not in ('MISSING_KEY', 'your_openai_api_key', ''):
            try:
                headers = {
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                }
                payload = {
                    'model': cls.EMBEDDING_MODEL,
                    'input': norm_text,
                    'dimensions': cls.DIMENSIONS,
                }
                response = requests.post(cls.OPENAI_API_URL, headers=headers, json=payload, timeout=10)
                response.raise_for_status()
                data = response.json()
                embedding = data['data'][0]['embedding']
                try:
                    cache.set(cache_key, embedding, cls.CACHE_TTL)
                except Exception:
                    pass
                return embedding
            except Exception as e:
                logger.warning("OpenAI embedding API call failed (%s). Falling back to mock generator.", e)

        # 3. Deterministic mock vector fallback
        embedding = cls._deterministic_mock_embedding(norm_text)
        try:
            cache.set(cache_key, embedding, cls.CACHE_TTL)
        except Exception:
            pass
        return embedding

    @classmethod
    def get_batch_embeddings(cls, texts: List[str], domain: str = "General") -> List[List[float]]:
        """
        Batch embeds a list of strings efficiently.
        """
        results = []
        for text in texts:
            results.append(cls.get_embedding(text, domain=domain))
        return results
