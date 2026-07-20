"""
Hallucination safeguards for the 2108Trade AI pipeline.

Implements Layers 1-4 from the architecture doc plus:
- Confidence floor: flag recommendations with confidence < 0.5
- Structured output parsing with retry on validation failure (max 2 retries)
- Post-processing source verification

Layer 1: Numerical data from Python, never LLM-generated (enforced by agent design)
Layer 2: Pydantic validation on all LLM outputs (enforced in each agent)
Layer 3: Citation enforcement — prompt requires source citations (enforced in prompts)
Layer 4: Post-processing source verification — check cited sources exist
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional, Type, TypeVar

from pydantic import BaseModel, ValidationError

from .state import Citation

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Confidence floor: flag anything below this
CONFIDENCE_FLOOR = 0.5
MAX_RETRIES = 2


# ── JSON extraction from LLM responses ────────────────────────────────────

def extract_json(text: str) -> Optional[dict[str, Any]]:
    """
    Extract a JSON object from an LLM response.

    Handles:
    - Pure JSON strings
    - JSON inside markdown code blocks (```json ... ```)
    - JSON inside regular code blocks (``` ... ```)
    - JSON after explanatory text
    """
    if not text or not text.strip():
        return None

    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown JSON code blocks
    json_block_pattern = r"```(?:json)?\s*\n(.*?)\n```"
    matches = re.findall(json_block_pattern, text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match.strip())
        except json.JSONDecodeError:
            continue

    # Try finding the first { and last } and parse that
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        return json.loads(text[start:end])
    except (ValueError, json.JSONDecodeError):
        pass

    # Try finding the first [ and last ] for arrays
    try:
        start = text.index("[")
        end = text.rindex("]") + 1
        return json.loads(text[start:end])
    except (ValueError, json.JSONDecodeError):
        pass

    return None


# ── Structured parsing with retry ─────────────────────────────────────────

async def parse_with_retry(
    text: str,
    model: Type[T],
    retry_callback=None,
    max_retries: int = MAX_RETRIES,
) -> tuple[Optional[T], Optional[str]]:
    """
    Parse LLM output into a Pydantic model with retry on failure.

    Args:
        text: Raw LLM response text
        model: Pydantic model class to parse into
        retry_callback: Async callable that takes an error message and returns
                       a new LLM response (used for retry)
        max_retries: Maximum number of retry attempts

    Returns:
        Tuple of (parsed_model_or_None, error_message_or_None)
    """
    parsed = _try_parse(text, model)
    if parsed is not None:
        return parsed, None

    # Retry loop
    for attempt in range(1, max_retries + 1):
        if retry_callback is None:
            break

        logger.warning(
            f"Parsing failed for {model.__name__}, retry {attempt}/{max_retries}"
        )
        try:
            error_context = (
                f"Your previous response could not be parsed as valid JSON matching "
                f"the required schema. Please respond ONLY with a valid JSON object. "
                f"The error was: {_get_parse_error(text, model)}"
            )
            new_text = await retry_callback(error_context)
            parsed = _try_parse(new_text, model)
            if parsed is not None:
                logger.info(f"Retry {attempt} succeeded for {model.__name__}")
                return parsed, None
        except Exception as e:
            logger.warning(f"Retry callback failed: {e}")

    return None, f"Failed to parse {model.__name__} after {max_retries} retries"


def _try_parse(text: str, model: Type[T]) -> Optional[T]:
    """Attempt to extract JSON and parse into model."""
    data = extract_json(text)
    if data is None:
        return None
    try:
        return model.model_validate(data)
    except ValidationError:
        return None


def _get_parse_error(text: str, model: Type[T]) -> str:
    """Get a human-readable parse error for retry context."""
    data = extract_json(text)
    if data is None:
        return "No valid JSON found in response."
    try:
        model.model_validate(data)
        return "Unknown validation error."
    except ValidationError as e:
        return str(e)


# ── Source verification (Layer 4) ─────────────────────────────────────────

def verify_citations(
    citations: list[Citation],
    known_sources: Optional[set[str]] = None,
    min_timestamp: Optional[datetime] = None,
) -> tuple[list[Citation], list[str]]:
    """
    Verify that citations reference real data sources.

    Layer 4 safeguard: Check that cited sources exist in known data.

    Args:
        citations: Citations claimed by the LLM
        known_sources: Set of valid source names (e.g., from actually-fetched data).
                      If None, passes all citations.
        min_timestamp: Minimum acceptable timestamp. Citations older than this
                      are flagged.

    Returns:
        Tuple of (verified_citations, warnings)
    """
    verified: list[Citation] = []
    warnings: list[str] = []

    for citation in citations:
        warning = None

        # Check source exists in known data
        if known_sources is not None and citation.source not in known_sources:
            warning = (
                f"Citation source '{citation.source}' not found in known data sources. "
                f"Available sources: {sorted(known_sources)}"
            )

        # Check timestamp freshness
        if min_timestamp and citation.timestamp < min_timestamp:
            warning = (
                f"Citation '{citation.source}' timestamp {citation.timestamp} "
                f"is older than minimum {min_timestamp}"
            )

        if warning:
            warnings.append(warning)
            logger.warning(f"[HallucinationGuard] {warning}")
            # Still include the citation but flag it
            verified.append(citation)
        else:
            verified.append(citation)

    return verified, warnings


# ── Confidence floor check ────────────────────────────────────────────────

def check_confidence(
    confidence: float,
    context: str = "",
) -> tuple[bool, Optional[str]]:
    """
    Check if confidence meets the minimum floor.

    Returns: (is_acceptable, warning_message_or_None)
    """
    if confidence < CONFIDENCE_FLOOR:
        msg = (
            f"Low confidence ({confidence:.2f}) — below floor ({CONFIDENCE_FLOOR:.2f}). "
            f"{context}Treat recommendations with caution."
        )
        logger.warning(f"[ConfidenceFloor] {msg}")
        return False, msg
    return True, None


# ── Data-only fallback builders ───────────────────────────────────────────

def build_market_context_text(
    symbols: list[str],
    timeframe: str,
    data_sources: list[str],
    market_data: Optional[dict[str, Any]] = None,
) -> str:
    """
    Build a structured text representation of available market data for the LLM.

    This is the NUMERICAL data that Python computes — NOT generated by the LLM.
    (Layer 1 safeguard: separation of computation from generation)
    """
    parts = [
        f"## Market Data Context",
        f"Symbols: {', '.join(symbols)}",
        f"Timeframe: {timeframe}",
        f"Available data sources: {', '.join(data_sources)}",
    ]

    if market_data:
        parts.append("\n### Available Market Data")
        for symbol, data in market_data.items():
            parts.append(f"\n#### {symbol}")
            if isinstance(data, dict):
                for key, value in data.items():
                    parts.append(f"  - {key}: {value}")
            else:
                parts.append(f"  {data}")

    return "\n".join(parts)


def build_fallback_assessment(
    symbols: list[str],
    market_data: Optional[dict[str, Any]] = None,
    error: str = "",
) -> dict[str, Any]:
    """
    Build a fallback MarketAssessment when the LLM is unavailable.

    Returns a dict suitable for MarketAssessment.model_validate().
    """
    now = datetime.now(timezone.utc)

    findings = [
        f"Data-only analysis for {', '.join(symbols)} — LLM synthesis unavailable",
    ]
    if error:
        findings.append(f"LLM error: {error}")

    if market_data:
        for symbol, data in market_data.items():
            if isinstance(data, dict):
                for key, value in data.items():
                    findings.append(f"{symbol} — {key}: {value}")

    citations = [
        Citation(
            source="Data-Only Fallback",
            timestamp=now,
            metric="Raw market data (no LLM synthesis)",
        ).model_dump()
    ]

    return {
        "sentiment": "neutral",
        "key_findings": findings,
        "citations": citations,
        "risk_factors": ["LLM synthesis unavailable — risk assessment limited to raw data"],
        "data_freshness": "recent" if market_data else "stale",
        "confidence": 0.3,
        "market_open": True,
    }
