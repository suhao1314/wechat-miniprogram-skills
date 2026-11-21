from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = REPOSITORY_ROOT / "scripts" / "validate_miniprogram_artifacts.py"


class ArtifactValidatorTests(unittest.TestCase):
    def write(self, root: Path, relative: str, content: str | bytes = "") -> None:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            path.write_bytes(content)
        else:
            path.write_text(content, encoding="utf-8")

    def base_fixture(self, root: Path) -> None:
        project_config = {
            "miniprogramRoot": "miniprogram/",
            "cloudfunctionRoot": "cloudfunctions/",
            "packOptions": {"ignore": [], "include": []},
        }
        app_config = {
            "pages": ["pages/home/index"],
            "tabBar": {
                "list": [
                    {
                        "pagePath": "pages/home/index",
                        "text": "首页",
                        "iconPath": "assets/home.png",
                        "selectedIconPath": "assets/home-selected.png",
                    }
                ]
            },
            "usingComponents": {"notice-card": "/components/notice-card/index"},
        }
        self.write(root, "project.config.json", json.dumps(project_config))
        self.write(root, "miniprogram/app.json", json.dumps(app_config))
        for suffix in ("js", "json", "wxml", "wxss"):
            content = "wx.cloud.callFunction({ name: 'ping' })" if suffix == "js" else "{}" if suffix == "json" else ""
            self.write(root, f"miniprogram/pages/home/index.{suffix}", content)
        for suffix in ("js", "json", "wxml", "wxss"):
            content = '{"component": true}' if suffix == "json" else ""
            self.write(root, f"miniprogram/components/notice-card/index.{suffix}", content)
        png = b"\x89PNG\r\n\x1a\n"
        self.write(root, "miniprogram/assets/home.png", png)
        self.write(root, "miniprogram/assets/home-selected.png", png)
        self.write(root, "cloudfunctions/ping/index.js", "exports.main = async () => ({ ok: true })")

    def run_validator(self, root: Path) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment["PYTHONIOENCODING"] = "utf-8"
        return subprocess.run(
            [sys.executable, str(VALIDATOR), str(root)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=environment,
            check=False,
        )

    def test_valid_project_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.base_fixture(root)
            result = self.run_validator(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("RESULT: PASS", result.stdout)

    def test_text_only_tabbar_and_typescript_page_pass(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.base_fixture(root)
            app_json = root / "miniprogram/app.json"
            app_config = json.loads(app_json.read_text(encoding="utf-8"))
            app_config["tabBar"]["list"][0].pop("iconPath")
            app_config["tabBar"]["list"][0].pop("selectedIconPath")
            app_json.write_text(json.dumps(app_config), encoding="utf-8")
            page_js = root / "miniprogram/pages/home/index.js"
            page_js.rename(page_js.with_suffix(".ts"))
            result = self.run_validator(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("RESULT: PASS", result.stdout)

    def test_missing_runtime_artifacts_fail_with_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.base_fixture(root)
            (root / "miniprogram/pages/home/index.wxml").unlink()
            (root / "miniprogram/assets/home-selected.png").unlink()
            (root / "cloudfunctions/ping").rename(root / "cloudfunctions/ping-missing")
            config = json.loads((root / "project.config.json").read_text(encoding="utf-8"))
            config["packOptions"] = {
                "ignore": [{"type": "folder", "value": "miniprogram/assets"}],
                "include": [{"type": "file", "value": "missing/config.json"}],
            }
            (root / "project.config.json").write_text(json.dumps(config), encoding="utf-8")
            result = self.run_validator(root)
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            for marker in (
                "PAGE_ARTIFACT_MISSING",
                "TABBAR_ICON_FILE_MISSING",
                "CLOUD_FUNCTION_MISSING",
                "RUNTIME_FILE_IGNORED",
                "PACK_INCLUDE_MISSING",
                "返回阶段：",
                "RESULT: FAIL",
            ):
                self.assertIn(marker, result.stdout)

    def test_renamed_non_png_tabbar_icon_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.base_fixture(root)
            (root / "miniprogram/assets/home.png").write_text("<svg/>", encoding="utf-8")
            result = self.run_validator(root)
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertIn("TABBAR_ICON_INVALID_PNG", result.stdout)


if __name__ == "__main__":
    unittest.main()
