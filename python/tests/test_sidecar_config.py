import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from python.main import app


class SidecarConfigSmokeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint_reports_ok(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["version"], "0.1.0")

    def test_readiness_reports_missing_openai_key(self) -> None:
        env = {
            "QUERIOUSLY_LLM_MODEL": "gpt-4o-mini",
        }
        with patch.dict(os.environ, env, clear=False):
            os.environ.pop("QUERIOUSLY_LLM_API_KEY", None)
            response = self.client.get("/config/readiness")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["ready"])
        self.assertEqual(body["status"], "missing_api_key")
        self.assertEqual(body["model"], "gpt-4o-mini")

    def test_readiness_accepts_configured_custom_provider(self) -> None:
        env = {
            "QUERIOUSLY_LLM_MODEL": "custom/research-model",
            "QUERIOUSLY_LLM_BASE": "http://127.0.0.1:8080/v1",
        }
        with patch.dict(os.environ, env, clear=False):
            response = self.client.get("/config/readiness")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ready"])
        self.assertEqual(body["status"], "ready")


if __name__ == "__main__":
    unittest.main()
