"""
Model pre-warming: ensures the configured Ollama model is available on startup.

On first boot, if the model isn't present, this pulls it from the Ollama registry.
This is a blocking operation during startup — models can be large (4-10 GB).
"""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


async def ensure_model_available(
    ollama_client,
    model_name: str,
    pull: bool = True,
) -> bool:
    """
    Check that the required model exists in Ollama.
    Optionally pull it if missing.
    Returns True if the model is now available.
    """
    # First, check if Ollama is even reachable
    available = await ollama_client.is_available()
    if not available:
        logger.warning(
            "Ollama is not reachable — running in data-only mode. "
            "Install Ollama and ensure it's running on port 11434 for AI features."
        )
        return False

    # Check if model exists
    exists = await ollama_client.model_exists(model_name)
    if exists:
        logger.info(f"Model '{model_name}' is already available in Ollama.")
        return True

    if not pull:
        logger.warning(f"Model '{model_name}' not found and auto-pull is disabled.")
        return False

    logger.info(f"Model '{model_name}' not found — pulling from Ollama registry...")
    logger.info(f"This may take several minutes (model is several GB).")

    success = await ollama_client.pull_model(model_name)
    if success:
        logger.info(f"Model '{model_name}' is now ready.")
    else:
        logger.error(
            f"Failed to pull model '{model_name}'. "
            "The AI service will start in data-only mode. "
            "Pull the model manually with: ollama pull {model_name}"
        )

    return success


async def bootstrap():
    """Run all bootstrapping tasks. Called at startup."""
    from .ollama_client import get_ollama

    ollama = get_ollama()

    # Pre-warm the default model
    model_name = ollama.default_model
    await ensure_model_available(ollama, model_name, pull=True)


def bootstrap_sync():
    """Synchronous wrapper for startup events."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    loop.run_until_complete(bootstrap())
