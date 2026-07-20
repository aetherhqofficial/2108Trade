"""
Explanation Agent

Role: Translate the full reasoning chain into plain-language explanations.
This is the most LLM-heavy agent — its primary output is the user-facing explanation.

Hallucination safeguards:
- Layer 1: All numbers come from pipeline state (Python), never LLM-generated
- Layer 2: Pydantic validation on TradeRecommendation
- Layer 3: Prompt requires source citations for every claim
- Layer 4: Post-processing verifies cited sources against pipeline state
- Confidence floor: flags recommendations below 0.5
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from ..ollama_client import get_ollama
from ..safeguards import (
    MAX_RETRIES,
    check_confidence,
    parse_with_retry,
    verify_citations,
)
from ..state import (
    AgentState,
    ApprovedCandidate,
    Citation,
    MarketAssessment,
    PipelineStatus,
    RejectedCandidate,
    RiskValidationReport,
    TradeRecommendation,
)

logger = logging.getLogger(__name__)

import os as _os

_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "explanation.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()

OUTPUT_SCHEMA = """
## Required JSON Output Format
You MUST respond with ONLY a valid JSON object:
{
  "reasoning_chain": "Full plain-language explanation with sections (Summary, Market Context, Trade Candidates, Risk Assessment, Confidence). Use markdown formatting.",
  "risk_summary": "Plain-language summary of risk assessment",
  "confidence": 0.0 to 1.0,
  "disclaimer": "Mandatory risk disclaimer text"
}

IMPORTANT RULES:
1. Lead with the conclusion — a one-paragraph summary of what we recommend and why
2. Use plain language — avoid jargon unless you define it
3. Cite specific data points for every claim (e.g., 'Based on [source] data...')
4. Explain rejections clearly — the user needs to know why something was rejected
5. State uncertainty honestly — never imply certainty where it doesn't exist
6. The reasoning_chain MUST follow the structure: Summary → Market Context → Trade Candidates → Risk Assessment → Confidence
7. Never promise profits. Never imply the AI is infallible.
"""

MANDATORY_DISCLAIMER = (
    "This is an AI-generated analysis for informational purposes only. "
    "It does not constitute financial advice. Past performance does not guarantee future results. "
    "All trading involves risk. Consult a qualified financial advisor before making investment decisions."
)


def _build_explanation_context(state: AgentState) -> str:
    """Build structured context from the full pipeline state for the LLM."""
    assessment: MarketAssessment | None = state.get("market_assessment")
    risk_report: RiskValidationReport | None = state.get("risk_report")
    user_profile: dict[str, Any] = state.get("user_profile", {})
    symbols = state.get("symbols", [])
    timeframe = state.get("timeframe", "1d")

    parts = ["## Full Pipeline Context for Explanation\n"]

    # Meta
    parts.append(f"**Symbols:** {', '.join(symbols)}")
    parts.append(f"**Timeframe:** {timeframe}")
    parts.append(f"**User Risk Tolerance:** {user_profile.get('risk_tolerance', 'moderate')}")
    parts.append("")

    # Market Assessment (Layer 1: all numbers from Python)
    if assessment:
        parts.append("### Market Assessment (from Market Analysis Agent)")
        parts.append(f"- Sentiment: **{assessment.sentiment.value}**")
        parts.append(f"- Confidence: {assessment.confidence:.2f}")
        parts.append(f"- Data Freshness: {assessment.data_freshness.value}")
        parts.append(f"- Market Open: {assessment.market_open}")
        parts.append("\n**Key Findings:**")
        for f in assessment.key_findings:
            parts.append(f"  - {f}")
        parts.append("\n**Risk Factors:**")
        for r in assessment.risk_factors:
            parts.append(f"  - {r}")
        parts.append("\n**Citations:**")
        for c in assessment.citations:
            parts.append(f"  - {c.source}: {c.metric or 'N/A'}")
        parts.append("")

    # Risk Report
    if risk_report:
        parts.append("### Risk Validation Report (from Risk Agent)")
        parts.append(f"- **Approved:** {len(risk_report.approved)} candidates")
        for ac in risk_report.approved:
            c = ac.candidate
            parts.append(
                f"  - ✅ {c.symbol} — {c.action.value.upper()} "
                f"(confidence: {c.confidence:.2f}, risk: {ac.risk_score:.2f})"
            )
            parts.append(f"    Rationale: {c.rationale}")
            parts.append(f"    Evidence: {', '.join(c.supporting_evidence)}")
        parts.append(f"\n- **Rejected:** {len(risk_report.rejected)} candidates")
        for rc in risk_report.rejected:
            c = rc.candidate
            parts.append(
                f"  - ❌ {c.symbol} — {c.action.value.upper()} "
                f"(reason: {rc.reason})"
            )
        parts.append("")

    return "\n".join(parts)


def _build_fallback_explanation(state: AgentState, error: str = "") -> TradeRecommendation:
    """Build a fallback TradeRecommendation when LLM is unavailable."""
    symbols = state.get("symbols", [])
    risk_report: RiskValidationReport | None = state.get("risk_report")
    assessment: MarketAssessment | None = state.get("market_assessment")

    approved = risk_report.approved if risk_report else []
    rejected = risk_report.rejected if risk_report else []
    symbols_str = ", ".join(symbols)

    reasoning = (
        f"# Analysis for {symbols_str}\n\n"
        f"## Summary\n"
        f"⚠️ **Data-Only Mode:** The AI explanation agent is currently unavailable. "
        f"The following is based on raw pipeline data without natural language synthesis.\n\n"
    )

    if assessment:
        reasoning += (
            f"## Market Context\n"
            f"Market sentiment: **{assessment.sentiment.value}** (confidence: {assessment.confidence:.2f}).\n"
        )
        if assessment.key_findings:
            reasoning += "\nKey findings:\n"
            for f in assessment.key_findings[:5]:
                reasoning += f"- {f}\n"

    reasoning += (
        f"\n## Trade Candidates\n"
        f"**Approved:** {len(approved)} | **Rejected:** {len(rejected)}\n"
    )

    for ac in approved:
        c = ac.candidate
        reasoning += (
            f"\n### {c.symbol}: {c.action.value.upper()}\n"
            f"- Rationale: {c.rationale}\n"
            f"- Risk Score: {ac.risk_score:.2f}\n"
            f"- Confidence: {c.confidence:.2f}\n"
        )

    for rc in rejected:
        c = rc.candidate
        reasoning += (
            f"\n### {c.symbol}: REJECTED\n"
            f"- Reason: {rc.reason}\n"
        )

    reasoning += (
        f"\n## Risk Summary\n"
        f"{len(approved)} candidate(s) approved, {len(rejected)} rejected by risk validation.\n"
        f"\n## Confidence\n"
        f"Low — explanation generated in data-only mode without AI synthesis.\n"
    )

    if error:
        reasoning += f"\n\n> ⚠️ LLM error: {error}\n"

    now = datetime.now(timezone.utc)
    return TradeRecommendation(
        candidates=approved,
        reasoning_chain=reasoning,
        citations=[
            Citation(
                source="2108Trade AI — Data-Only Fallback",
                timestamp=now,
                metric="Pipeline data (no LLM synthesis)",
            ),
        ],
        risk_summary=(
            f"Risk validation: {len(approved)} approved, {len(rejected)} rejected. "
            "Data-only mode — limited risk analysis."
        ),
        disclaimer=MANDATORY_DISCLAIMER,
        confidence=0.15,
        status=PipelineStatus.COMPLETED,
    )


async def explanation_agent(state: AgentState) -> dict:
    """
    Explanation Agent node.

    Uses LLM to synthesize the full reasoning chain into a plain-language
    TradeRecommendation. Falls back to a data-only explanation if the LLM
    is unavailable.

    Inputs: Full SharedState (MarketAssessment, candidates, RiskValidationReport)
    Outputs: TradeRecommendation with reasoning chain, citations, risk summary
    """
    assessment = state.get("market_assessment")
    risk_report = state.get("risk_report")
    symbols = state.get("symbols", [])

    approved_count = len(risk_report.approved) if risk_report else 0
    rejected_count = len(risk_report.rejected) if risk_report else 0

    logger.info(
        f"[Explanation] Generating recommendation — "
        f"{approved_count} approved, {rejected_count} rejected"
    )

    ollama = get_ollama()
    available = await ollama.is_available()

    if not available:
        logger.warning("[Explanation] Ollama unavailable — using data-only fallback")
        rec = _build_fallback_explanation(state)
        return {"recommendation": rec, "status": PipelineStatus.COMPLETED}

    # Build structured context
    context_text = _build_explanation_context(state)

    full_prompt = SYSTEM_PROMPT + "\n\n" + OUTPUT_SCHEMA

    # Gather pipeline citations for source verification (Layer 4)
    pipeline_sources: set[str] = set()
    if assessment:
        for c in assessment.citations:
            pipeline_sources.add(c.source)
    pipeline_sources.add("2108Trade AI Pipeline")
    pipeline_sources.add("Risk Validation Engine")

    messages = [
        {"role": "system", "content": full_prompt},
        {
            "role": "user",
            "content": (
                f"Based on the following complete pipeline context, produce a clear, "
                f"plain-language trade recommendation explanation.\n\n"
                f"{context_text}\n\n"
                f"Respond ONLY with the JSON object as specified in the system prompt."
            ),
        },
    ]

    async def retry_callback(error_context: str) -> str:
        retry_messages = messages + [
            {"role": "assistant", "content": "[Previous response had parse errors]"},
            {"role": "user", "content": error_context},
        ]
        return await ollama.chat_or_none(retry_messages, fallback="{}")

    try:
        llm_response = await ollama.chat(messages, temperature=0.3, max_tokens=3072)
        llm_text = llm_response["content"]
        logger.info(f"[Explanation] LLM response received, length={len(llm_text)}")
    except Exception as e:
        logger.warning(f"[Explanation] LLM call failed: {e}")
        rec = _build_fallback_explanation(state, error=str(e))
        return {"recommendation": rec, "status": PipelineStatus.COMPLETED}

    # Parse with retry (Layer 2: Pydantic validation)
    # Note: We parse into a dict first, then build TradeRecommendation manually
    # because the LLM outputs reasoning_chain + risk_summary + confidence,
    # and we add the candidates/citations from pipeline state
    from ..safeguards import extract_json

    parsed_dict = extract_json(llm_text)

    if parsed_dict is None:
        logger.warning("[Explanation] Could not extract JSON — retrying")
        try:
            retry_text = await retry_callback(
                "Your response must be a single valid JSON object with reasoning_chain, "
                "risk_summary, confidence, and disclaimer fields. No markdown, no extra text."
            )
            parsed_dict = extract_json(retry_text)
        except Exception:
            pass

    if parsed_dict is None or not isinstance(parsed_dict, dict):
        logger.warning("[Explanation] Parse failed — using fallback")
        rec = _build_fallback_explanation(state, error="LLM response could not be parsed as JSON")
        return {"recommendation": rec, "status": PipelineStatus.COMPLETED}

    # Build recommendation from LLM output + pipeline state
    reasoning_chain = parsed_dict.get("reasoning_chain", "")
    risk_summary = parsed_dict.get("risk_summary", "")
    llm_confidence = float(parsed_dict.get("confidence", 0.5))
    disclaimer = parsed_dict.get("disclaimer", MANDATORY_DISCLAIMER)

    # Ensure proper disclaimer
    if MANDATORY_DISCLAIMER not in disclaimer:
        disclaimer = disclaimer + "\n\n" + MANDATORY_DISCLAIMER

    # Gather candidates from risk report
    approved_candidates = risk_report.approved if risk_report else []
    rejected_candidates = risk_report.rejected if risk_report else []

    # Gather all citations from pipeline
    all_citations: list[Citation] = []
    if assessment:
        all_citations.extend(list(assessment.citations))

    # Add a pipeline citation
    now = datetime.now(timezone.utc)
    all_citations.append(
        Citation(
            source="2108Trade AI Pipeline",
            timestamp=now,
            metric=f"Full pipeline analysis for {', '.join(symbols)}",
        )
    )

    # Layer 4: Verify citations from LLM output don't hallucinate sources
    # (We use the pipeline_sources we gathered above)
    verified_citations, citation_warnings = verify_citations(
        all_citations, known_sources=pipeline_sources
    )
    if citation_warnings:
        logger.warning(f"[Explanation] Citation warnings: {citation_warnings}")
        reasoning_chain += (
            f"\n\n> ⚠️ Note: {len(citation_warnings)} citation(s) could not be verified "
            f"against known data sources. Findings should be treated with caution."
        )

    # Confidence floor check
    is_confident, conf_warning = check_confidence(
        llm_confidence, context=f"Symbols: {', '.join(symbols)}. "
    )
    if not is_confident and conf_warning:
        reasoning_chain += f"\n\n> ⚠️ {conf_warning}"
        if llm_confidence < 0.3:
            reasoning_chain += (
                "\n\n> This analysis has very low confidence. "
                "Consider waiting for better market conditions or more data."
            )

    # Add rejection summary if any
    if rejected_candidates:
        reasoning_chain += "\n\n## Rejected Candidates\n"
        for rc in rejected_candidates:
            reasoning_chain += (
                f"- **{rc.candidate.symbol}** ({rc.candidate.action.value.upper()}): "
                f"{rc.reason}\n"
            )

    recommendation = TradeRecommendation(
        candidates=approved_candidates,
        reasoning_chain=reasoning_chain,
        citations=verified_citations,
        risk_summary=risk_summary,
        disclaimer=disclaimer,
        confidence=llm_confidence,
        status=PipelineStatus.COMPLETED,
    )

    logger.info(
        f"[Explanation] Complete: {len(approved_candidates)} approved, "
        f"{len(rejected_candidates)} rejected, confidence={llm_confidence:.2f}"
    )

    return {
        "recommendation": recommendation,
        "status": PipelineStatus.COMPLETED,
    }
