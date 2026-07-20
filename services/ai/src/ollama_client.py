"""
Ollama client using httpx with OpenAI-compatible /v1/chat/completions endpoint.

Supports:
- Chat completions via OpenAI-compatible API
- Model listing
- Health checks
- Graceful fallback when Ollama is unavailable
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx
from pydantic import BaseModel

from .state import ModelInfo

logger = logging.getLogger(__name__)

# Default model from the architecture doc (recommended tier)
DEFAULT_MODEL = "llama3.1:8b"


class OllamaClient:
    """
    Async client for Ollama's OpenAI-compatible API.

    Falls back gracefully to data-only mode when Ollama is unavailable.
    """

    def __init__(
        self,
        base_url: str = "http://ollama:11434",
        default_model: str = DEFAULT_MODEL,
        timeout: float = 60.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self._client: Optional[httpx.AsyncClient] = None
        self._timeout = timeout

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(self._timeout))
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    # ── Health ──────────────────────────────────────────────────────────

    async def is_available(self) -> bool:
        """Check if Ollama is reachable and responding."""
        try:
            client = await self._get_client()
            resp = await client.get(f"{self.base_url}/api/tags")
            return resp.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[ModelInfo]:
        """List all available Ollama models."""
        try:
            client = await self._get_client()
            resp = await client.get(f"{self.base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = []
            for m in data.get("models", []):
                models.append(ModelInfo(
                    name=m.get("name", "unknown"),
                    size=str(m.get("size", "unknown")),
                    modified_at=m.get("modified_at"),
                ))
            return models
        except Exception as e:
            logger.warning(f"Failed to list Ollama models: {e}")
            return []

    async def model_exists(self, model_name: str) -> bool:
        """Check if a specific model is available."""
        models = await self.list_models()
        # Match exact name or name without tag
        base_name = model_name.split(":")[0]
        for m in models:
            if m.name == model_name:
                return True
            if m.name.startswith(f"{base_name}:"):
                return True
        return False

    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry. Returns True on success."""
        try:
            client = await self._get_client()
            resp = await client.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name, "stream": False},
                timeout=httpx.Timeout(600.0),  # 10 min for model download
            )
            if resp.status_code == 200:
                logger.info(f"Successfully pulled model: {model_name}")
                return True
            logger.warning(f"Failed to pull model {model_name}: {resp.status_code} {resp.text}")
            return False
        except Exception as e:
            logger.warning(f"Failed to pull model {model_name}: {e}")
            return False

    # ── Chat Completions ────────────────────────────────────────────────

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Send a chat completion request via Ollama's OpenAI-compatible endpoint.

        Returns: {"content": str, "model": str, "usage": dict, ...} or raises.
        """
        model_name = model or self.default_model
        client = await self._get_client()

        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
            **kwargs,
        }

        resp = await client.post(
            f"{self.base_url}/v1/chat/completions",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        choice = data["choices"][0]
        return {
            "content": choice["message"]["content"],
            "model": data.get("model", model_name),
            "usage": data.get("usage", {}),
            "finish_reason": choice.get("finish_reason", "stop"),
        }

    async def chat_or_none(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        fallback: str = "[Ollama unavailable — data-only mode]",
        **kwargs: Any,
    ) -> str:
        """
        Convenience: try chat, return fallback string if Ollama is down.
        """
        try:
            result = await self.chat(messages, model=model, **kwargs)
            return result["content"]
        except Exception as e:
            logger.warning(f"Ollama chat failed: {e}")
            return fallback


# ── Singleton ───────────────────────────────────────────────────────────

_ollama: Optional[OllamaClient] = None


def get_ollama() -> OllamaClient:
    """Get or create the Ollama client singleton."""
    global _ollama
    if _ollama is None:
        import os
        base_url = os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434")
        model = os.environ.get("OLLAMA_MODEL", DEFAULT_MODEL)
        _ollama = OllamaClient(base_url=base_url, default_model=model)
    return _ollama
