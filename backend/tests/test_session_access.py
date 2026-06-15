from __future__ import annotations

import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from app.agents.session_access import ensure_session_access


class SessionAccessTests(unittest.TestCase):
    def test_requires_approved_brief(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            ensure_session_access(
                SimpleNamespace(approved=False, strategy_confirmed=False),
                require_approved=True,
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("brief is approved", ctx.exception.detail)

    def test_requires_confirmed_strategy(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            ensure_session_access(
                SimpleNamespace(approved=True, strategy_confirmed=False),
                require_strategy=True,
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("strategy is confirmed", ctx.exception.detail)

    def test_returns_brief_when_requirements_pass(self) -> None:
        brief = SimpleNamespace(approved=True, strategy_confirmed=True)
        self.assertIs(
            ensure_session_access(brief, require_approved=True, require_strategy=True),
            brief,
        )


if __name__ == "__main__":
    unittest.main()
