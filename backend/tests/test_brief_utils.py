from __future__ import annotations

import unittest

from app.api.brief import extract_json_block


class ExtractJsonBlockTests(unittest.TestCase):
    def test_extracts_plain_json(self) -> None:
        result = extract_json_block('{"brand_name": "SCOPE"}')
        self.assertEqual(result["brand_name"], "SCOPE")

    def test_extracts_fenced_json(self) -> None:
        result = extract_json_block("```json\n{\"region\": \"usa\"}\n```")
        self.assertEqual(result["region"], "usa")


if __name__ == "__main__":
    unittest.main()
