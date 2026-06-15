from __future__ import annotations

import contextlib
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import dspy

from app.agents.prompt_pipeline import _brief_payload, normalize_region, run_brief_pipeline


def _generated_payload(brand_name: str) -> SimpleNamespace:
    return SimpleNamespace(
        brand_name=brand_name,
        industry="Athleisure",
        summary="A concise summary.",
        mission="Mission copy",
        vision="Vision copy",
        persona="Persona copy",
        values="Values copy",
        voice="Voice copy",
        promise="Promise copy",
        audience="Urban professionals",
        positioning="Premium regenerative performance brand",
        value_proposition="High-function essentials with lower waste",
        reasons_to_believe=["Verified materials", "Repair program"],
        recommended_channels=["Meta", "Retail"],
        compliance_cultural_notes=["Avoid unsupported sustainability claims"],
        competitive_context="Competes with premium activewear labels.",
        visual_cues=["Technical textures"],
        competitive_signals=["Performance-first positioning"],
        recommended_next="Review and approve the brief.",
    )


class PromptPipelineTests(unittest.TestCase):
    def test_normalize_region_accepts_aliases(self) -> None:
        self.assertEqual(normalize_region("USA"), "usa")
        self.assertEqual(normalize_region("golf"), "gcc")
        self.assertEqual(normalize_region("middle east and north africa"), "mena")

    def test_run_brief_pipeline_retries_failed_quality_gate(self) -> None:
        enhancer = Mock(
            return_value=SimpleNamespace(
                enhanced_prompt="Enhanced founder prompt",
                image_analysis_focus="Look for packaging cues",
            )
        )
        generator = Mock(
            side_effect=[
                _generated_payload("Draft One"),
                _generated_payload("Draft Two"),
            ]
        )
        evaluator = Mock(
            side_effect=[
                SimpleNamespace(passed=False, issues=["Missing compliance notes"]),
                SimpleNamespace(passed=True, issues=[]),
            ]
        )

        with patch("app.agents.prompt_pipeline.create_dspy_lm", return_value=object()), patch(
            "app.agents.prompt_pipeline.brief_guide_excerpt",
            return_value="Guide excerpt",
        ), patch(
            "app.agents.prompt_pipeline.dspy.context",
            new=lambda **_: contextlib.nullcontext(),
        ):
            result = run_brief_pipeline(
                user_prompt="Build a regenerative sportswear brand",
                region="gcc",
                vision_notes="Chrome details and modular packaging",
                modules=(enhancer, generator, evaluator),
            )

        self.assertEqual(result.region, "gcc")
        self.assertEqual(result.generated["brand_name"], "Draft Two")
        self.assertTrue(result.evaluation["passed"])
        self.assertEqual(generator.call_count, 2)
        self.assertEqual(evaluator.call_count, 2)
        refined_prompt = generator.call_args_list[1].kwargs["enhanced_prompt"]
        self.assertIn("Missing compliance notes", refined_prompt)

    def test_brief_payload_reads_reserved_values_field_by_key(self) -> None:
        prediction = dspy.Prediction.from_completions(
            [
                {
                    "brand_name": "SCOPE",
                    "industry": "Brand tech",
                    "summary": "Summary",
                    "mission": "Mission",
                    "vision": "Vision",
                    "persona": "Persona",
                    "values": "Core values",
                    "voice": "Voice",
                    "promise": "Promise",
                    "audience": "Audience",
                    "positioning": "Positioning",
                    "value_proposition": "Value prop",
                    "reasons_to_believe": ["Reason"],
                    "recommended_channels": ["Channel"],
                    "compliance_cultural_notes": ["Note"],
                    "competitive_context": "Competitive context",
                    "visual_cues": ["Cue"],
                    "competitive_signals": ["Signal"],
                    "recommended_next": "Next",
                }
            ]
        )

        payload = _brief_payload(prediction)

        self.assertEqual(payload["pillars"]["values"], "Core values")
        self.assertEqual(payload["marketing_standards"]["reasons_to_believe"], ["Reason"])


if __name__ == "__main__":
    unittest.main()
