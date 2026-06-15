from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import dspy

from app.agents.model_factory import create_dspy_lm

GUIDE_PATH = Path(__file__).resolve().parent / "resources" / "scope_prompt_guide.md"
REGION_LABELS = {
    "usa": "USA",
    "mena": "MENA",
    "gcc": "GCC",
}


class EnhanceBriefPrompt(dspy.Signature):
    """Turn a loose founder prompt into a prompt suited for SCOPE's pipeline."""

    guide_excerpt: str = dspy.InputField()
    region: str = dspy.InputField()
    user_prompt: str = dspy.InputField()
    enhanced_prompt: str = dspy.OutputField()
    image_analysis_focus: str = dspy.OutputField()


class GenerateMarketingBrief(dspy.Signature):
    """Generate a brief and marketing standards package from text and vision notes."""

    guide_excerpt: str = dspy.InputField()
    region: str = dspy.InputField()
    enhanced_prompt: str = dspy.InputField()
    vision_notes: str = dspy.InputField()
    brand_name: str = dspy.OutputField()
    industry: str = dspy.OutputField()
    summary: str = dspy.OutputField()
    mission: str = dspy.OutputField()
    vision: str = dspy.OutputField()
    persona: str = dspy.OutputField()
    values: str = dspy.OutputField()
    voice: str = dspy.OutputField()
    promise: str = dspy.OutputField()
    audience: str = dspy.OutputField()
    positioning: str = dspy.OutputField()
    value_proposition: str = dspy.OutputField()
    reasons_to_believe: list[str] = dspy.OutputField()
    recommended_channels: list[str] = dspy.OutputField()
    compliance_cultural_notes: list[str] = dspy.OutputField()
    competitive_context: str = dspy.OutputField()
    visual_cues: list[str] = dspy.OutputField()
    competitive_signals: list[str] = dspy.OutputField()
    recommended_next: str = dspy.OutputField()


class EvaluateBriefQuality(dspy.Signature):
    """Judge whether the generated brief is complete enough to ship for human review."""

    region: str = dspy.InputField()
    generated_payload: str = dspy.InputField()
    passed: bool = dspy.OutputField()
    issues: list[str] = dspy.OutputField()


@dataclass
class BriefPipelineResult:
    region: str
    enhanced_prompt: str
    image_analysis_focus: str
    generated: dict[str, Any]
    evaluation: dict[str, Any]


def normalize_region(value: str) -> str:
    cleaned = (value or "").strip().lower()
    aliases = {
        "usa": "usa",
        "us": "usa",
        "u.s.a": "usa",
        "mena": "mena",
        "middle east": "mena",
        "middle east and north africa": "mena",
        "gcc": "gcc",
        "gulf": "gcc",
        "golf": "gcc",
        "gulf/gcc": "gcc",
    }
    if cleaned not in aliases:
        raise ValueError("Invalid region. Expected one of: usa, mena, gcc")
    return aliases[cleaned]


def region_label(value: str) -> str:
    return REGION_LABELS[normalize_region(value)]


@lru_cache(maxsize=1)
def load_scope_prompt_guide() -> str:
    if not GUIDE_PATH.exists():
        raise FileNotFoundError(f"Missing prompt guide markdown: {GUIDE_PATH}")
    return GUIDE_PATH.read_text(encoding="utf-8").strip()


def brief_guide_excerpt() -> str:
    guide = load_scope_prompt_guide()
    max_len = 12000
    return guide[:max_len]


def _default_modules() -> tuple[dspy.Predict, dspy.Predict, dspy.Predict]:
    return (
        dspy.Predict(EnhanceBriefPrompt),
        dspy.Predict(GenerateMarketingBrief),
        dspy.Predict(EvaluateBriefQuality),
    )


def _prediction_value(prediction: Any, key: str, default: Any = "") -> Any:
    if isinstance(prediction, dict):
        return prediction.get(key, default)
    try:
        return prediction[key]
    except Exception:
        pass
    return getattr(prediction, key, default)


def _brief_payload(generated: Any) -> dict[str, Any]:
    return {
        "brand_name": _prediction_value(generated, "brand_name"),
        "industry": _prediction_value(generated, "industry"),
        "summary": _prediction_value(generated, "summary"),
        "pillars": {
            "mission": _prediction_value(generated, "mission"),
            "vision": _prediction_value(generated, "vision"),
            "persona": _prediction_value(generated, "persona"),
            "values": _prediction_value(generated, "values"),
            "voice": _prediction_value(generated, "voice"),
            "promise": _prediction_value(generated, "promise"),
        },
        "marketing_standards": {
            "audience": _prediction_value(generated, "audience"),
            "positioning": _prediction_value(generated, "positioning"),
            "value_proposition": _prediction_value(generated, "value_proposition"),
            "reasons_to_believe": list(_prediction_value(generated, "reasons_to_believe", [])),
            "recommended_channels": list(_prediction_value(generated, "recommended_channels", [])),
            "compliance_cultural_notes": list(
                _prediction_value(generated, "compliance_cultural_notes", [])
            ),
            "competitive_context": _prediction_value(generated, "competitive_context"),
        },
        "visual_cues": list(_prediction_value(generated, "visual_cues", [])),
        "competitive_signals": list(_prediction_value(generated, "competitive_signals", [])),
        "recommended_next": _prediction_value(generated, "recommended_next"),
    }


def run_brief_pipeline(
    *,
    user_prompt: str,
    region: str,
    vision_notes: str,
    modules: tuple[Any, Any, Any] | None = None,
) -> BriefPipelineResult:
    normalized_region = normalize_region(region)
    guide_excerpt = brief_guide_excerpt()
    enhancer, generator, evaluator = modules or _default_modules()

    with dspy.context(lm=create_dspy_lm(), adapter=dspy.JSONAdapter()):
        enhanced = enhancer(
            guide_excerpt=guide_excerpt,
            region=region_label(normalized_region),
            user_prompt=user_prompt,
        )

        generated = generator(
            guide_excerpt=guide_excerpt,
            region=region_label(normalized_region),
            enhanced_prompt=enhanced.enhanced_prompt,
            vision_notes=vision_notes or "No reference-image notes were extracted.",
        )

        generated_payload = _brief_payload(generated)
        evaluation = evaluator(
            region=region_label(normalized_region),
            generated_payload=json.dumps(generated_payload, ensure_ascii=True),
        )

        if not evaluation.passed:
            refined_prompt = (
                f"{enhanced.enhanced_prompt}\n\n"
                f"Address these missing standards before returning the final brief: "
                f"{'; '.join(evaluation.issues)}."
            )
            generated = generator(
                guide_excerpt=guide_excerpt,
                region=region_label(normalized_region),
                enhanced_prompt=refined_prompt,
                vision_notes=vision_notes or "No reference-image notes were extracted.",
            )
            generated_payload = _brief_payload(generated)
            evaluation = evaluator(
                region=region_label(normalized_region),
                generated_payload=json.dumps(generated_payload, ensure_ascii=True),
            )

    return BriefPipelineResult(
        region=normalized_region,
        enhanced_prompt=enhanced.enhanced_prompt,
        image_analysis_focus=enhanced.image_analysis_focus,
        generated=generated_payload,
        evaluation={
            "passed": bool(evaluation.passed),
            "issues": list(evaluation.issues),
        },
    )
