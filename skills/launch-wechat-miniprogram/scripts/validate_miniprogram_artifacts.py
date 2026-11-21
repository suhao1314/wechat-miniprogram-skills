#!/usr/bin/env python3
"""Validate deterministic WeChat Mini Program build artifacts without modifying them."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath


PAGE_EXTENSIONS = (".json", ".wxml", ".wxss")
COMPONENT_EXTENSIONS = (".json", ".wxml", ".wxss")
SCRIPT_EXTENSIONS = (".js", ".ts")
REMOTE_PREFIXES = ("plugin://", "dynamicLib://", "ext://", "http://", "https://")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


@dataclass(frozen=True)
class Finding:
    level: str
    code: str
    location: str
    message: str
    evidence: str
    return_stage: str


class Validator:
    def __init__(self, project_root: Path) -> None:
        self.project_root = project_root.resolve()
        self.findings: list[Finding] = []
        self.runtime_files: set[Path] = set()

    def add(
        self,
        level: str,
        code: str,
        location: Path | str,
        message: str,
        evidence: str,
        return_stage: str,
    ) -> None:
        if isinstance(location, Path):
            try:
                location_text = location.resolve().relative_to(self.project_root).as_posix()
            except ValueError:
                location_text = str(location)
        else:
            location_text = location
        self.findings.append(
            Finding(level, code, location_text, message, evidence, return_stage)
        )

    def read_json(self, path: Path, code: str, stage: str) -> dict | None:
        if not path.is_file():
            self.add("ERROR", code, path, "缺少必需的 JSON 文件", "文件不存在", stage)
            return None
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            self.add("ERROR", code, path, "JSON 无法解析", str(error), stage)
            return None
        if not isinstance(value, dict):
            self.add("ERROR", code, path, "JSON 顶层必须是对象", type(value).__name__, stage)
            return None
        self.runtime_files.add(path.resolve())
        return value

    def configured_path(self, root: Path, raw_value: object) -> Path | None:
        if not isinstance(raw_value, str) or not raw_value.strip():
            return None
        return root.joinpath(*PurePosixPath(raw_value.replace("\\", "/")).parts).resolve()

    def display_path(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.project_root).as_posix()
        except ValueError:
            return str(path)

    def validate_page(self, mini_root: Path, route: str, source: str) -> Path | None:
        normalized = route.strip().lstrip("/")
        route_path = PurePosixPath(normalized)
        if not normalized or ".." in route_path.parts:
            self.add(
                "ERROR",
                "PAGE_ROUTE_INVALID",
                source,
                "页面路径为空或越出小程序源码目录",
                repr(route),
                "开发",
            )
            return None
        base = mini_root.joinpath(*route_path.parts)
        script = next((base.with_suffix(ext) for ext in SCRIPT_EXTENSIONS if base.with_suffix(ext).is_file()), None)
        if script is None:
            self.add(
                "ERROR",
                "PAGE_ARTIFACT_MISSING",
                base,
                f"页面 {route} 缺少 .js/.ts 产物",
                f"声明来源：{source}",
                "开发",
            )
        else:
            self.runtime_files.add(script.resolve())
        for extension in PAGE_EXTENSIONS:
            artifact = base.with_suffix(extension)
            if not artifact.is_file():
                self.add(
                    "ERROR",
                    "PAGE_ARTIFACT_MISSING",
                    artifact,
                    f"页面 {route} 缺少 {extension} 产物",
                    f"声明来源：{source}",
                    "开发",
                )
            else:
                self.runtime_files.add(artifact.resolve())
        page_json = base.with_suffix(".json")
        return page_json if page_json.is_file() else None

    def validate_tabbar(self, mini_root: Path, app_config: dict, app_json: Path) -> None:
        tabbar = app_config.get("tabBar")
        if not isinstance(tabbar, dict):
            return
        items = tabbar.get("list", [])
        if not isinstance(items, list):
            self.add("ERROR", "TABBAR_LIST_INVALID", app_json, "tabBar.list 必须是数组", repr(items), "开发")
            return
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                self.add("ERROR", "TABBAR_ITEM_INVALID", app_json, "tabBar 项必须是对象", f"索引 {index}", "开发")
                continue
            icon_keys = ("iconPath", "selectedIconPath")
            if not any(item.get(key) for key in icon_keys):
                continue
            for key in icon_keys:
                raw_path = item.get(key)
                evidence = f"tabBar.list[{index}].{key}={raw_path!r}"
                if not isinstance(raw_path, str) or not raw_path:
                    self.add("ERROR", "TABBAR_ICON_MISSING", app_json, f"原生 tabBar 缺少 {key}", evidence, "设计")
                    continue
                if raw_path.startswith(REMOTE_PREFIXES) or Path(raw_path).suffix.lower() != ".png":
                    self.add(
                        "ERROR",
                        "TABBAR_ICON_NOT_LOCAL_PNG",
                        app_json,
                        "原生 tabBar 图标必须是项目内本地 PNG",
                        evidence,
                        "设计",
                    )
                    continue
                icon = mini_root.joinpath(*PurePosixPath(raw_path.lstrip("/")).parts).resolve()
                if not icon.is_relative_to(mini_root.resolve()):
                    self.add(
                        "ERROR",
                        "TABBAR_ICON_NOT_LOCAL_PNG",
                        app_json,
                        "tabBar 图标路径越出小程序源码目录",
                        evidence,
                        "设计",
                    )
                    continue
                if not icon.is_file():
                    self.add("ERROR", "TABBAR_ICON_FILE_MISSING", icon, "tabBar 图标文件不存在", evidence, "开发")
                else:
                    try:
                        signature = icon.read_bytes()[: len(PNG_SIGNATURE)]
                    except OSError as error:
                        self.add("ERROR", "TABBAR_ICON_UNREADABLE", icon, "tabBar 图标无法读取", str(error), "开发")
                        continue
                    if signature != PNG_SIGNATURE:
                        self.add("ERROR", "TABBAR_ICON_INVALID_PNG", icon, "tabBar 图标不是有效的 PNG 文件", evidence, "开发")
                    else:
                        self.runtime_files.add(icon.resolve())

    @staticmethod
    def component_base(config_file: Path, mini_root: Path, value: str) -> Path | None:
        if value.startswith(REMOTE_PREFIXES):
            return None
        if value.startswith("/"):
            return mini_root.joinpath(*PurePosixPath(value.lstrip("/")).parts)
        if value.startswith("."):
            return config_file.parent.joinpath(*PurePosixPath(value.replace("\\", "/")).parts).resolve()
        return None

    def validate_components(self, mini_root: Path, config_files: list[Path]) -> None:
        queue = list(config_files)
        visited: set[Path] = set()
        while queue:
            config_file = queue.pop(0).resolve()
            if config_file in visited or not config_file.is_file():
                continue
            visited.add(config_file)
            config = self.read_json(config_file, "COMPONENT_CONFIG_INVALID", "开发")
            if config is None:
                continue
            components = config.get("usingComponents", {})
            if components is None:
                continue
            if not isinstance(components, dict):
                self.add("ERROR", "USING_COMPONENTS_INVALID", config_file, "usingComponents 必须是对象", repr(components), "开发")
                continue
            for alias, raw_value in components.items():
                if not isinstance(raw_value, str):
                    self.add("ERROR", "COMPONENT_PATH_INVALID", config_file, f"组件 {alias} 的路径必须是字符串", repr(raw_value), "开发")
                    continue
                base = self.component_base(config_file, mini_root, raw_value)
                if base is None:
                    continue
                if not base.resolve().is_relative_to(mini_root.resolve()):
                    self.add(
                        "ERROR",
                        "COMPONENT_PATH_OUTSIDE_ROOT",
                        config_file,
                        f"本地组件 {alias} 的路径越出小程序源码目录",
                        raw_value,
                        "开发",
                    )
                    continue
                missing: list[str] = []
                for extension in COMPONENT_EXTENSIONS:
                    artifact = base.with_suffix(extension)
                    if artifact.is_file():
                        self.runtime_files.add(artifact.resolve())
                    else:
                        missing.append(extension)
                script = next((base.with_suffix(ext) for ext in SCRIPT_EXTENSIONS if base.with_suffix(ext).is_file()), None)
                if script:
                    self.runtime_files.add(script.resolve())
                else:
                    missing.append(".js/.ts")
                if missing:
                    self.add(
                        "ERROR",
                        "COMPONENT_ARTIFACT_MISSING",
                        config_file,
                        f"本地组件 {alias} 缺少产物：{', '.join(missing)}",
                        raw_value,
                        "开发",
                    )
                component_json = base.with_suffix(".json")
                if component_json.is_file():
                    queue.append(component_json)

    def find_cloud_function_calls(self, mini_root: Path) -> dict[str, list[Path]]:
        pattern = re.compile(
            r"wx\.cloud\.callFunction\s*\(\s*\{[\s\S]{0,500}?\bname\s*:\s*['\"]([^'\"]+)['\"]"
        )
        calls: dict[str, list[Path]] = {}
        for extension in SCRIPT_EXTENSIONS:
            for script in mini_root.rglob(f"*{extension}"):
                try:
                    content = script.read_text(encoding="utf-8")
                except (OSError, UnicodeError):
                    continue
                for name in pattern.findall(content):
                    calls.setdefault(name, []).append(script)
        return calls

    @staticmethod
    def ignore_matches(relative: str, rule: object) -> bool:
        if isinstance(rule, str):
            value = rule.strip("/")
            return relative == value or relative.startswith(f"{value}/")
        if not isinstance(rule, dict):
            return False
        rule_type = str(rule.get("type", "")).lower()
        value = str(rule.get("value", "")).replace("\\", "/").strip("/")
        if not value:
            return False
        if rule_type == "file":
            return relative == value
        if rule_type == "folder":
            return relative == value or relative.startswith(f"{value}/")
        if rule_type == "suffix":
            return relative.endswith(value)
        if rule_type == "prefix":
            return relative.startswith(value)
        if rule_type in {"regexp", "regex"}:
            try:
                return re.search(value, relative) is not None
            except re.error:
                return False
        return False

    def validate_pack_options(self, project_config: dict, config_path: Path, mini_root: Path) -> None:
        pack_options = project_config.get("packOptions", {})
        if not isinstance(pack_options, dict):
            self.add("ERROR", "PACK_OPTIONS_INVALID", config_path, "packOptions 必须是对象", repr(pack_options), "环境准备")
            return
        ignore_rules = pack_options.get("ignore", [])
        if isinstance(ignore_rules, list):
            for runtime_file in sorted(self.runtime_files):
                relative_candidates: list[str] = []
                try:
                    relative_candidates.append(runtime_file.relative_to(self.project_root).as_posix())
                except ValueError:
                    pass
                try:
                    relative_candidates.append(runtime_file.relative_to(mini_root).as_posix())
                except ValueError:
                    pass
                relative_candidates = list(dict.fromkeys(relative_candidates))
                for rule in ignore_rules:
                    matched = next((relative for relative in relative_candidates if self.ignore_matches(relative, rule)), None)
                    if matched:
                        self.add(
                            "ERROR",
                            "RUNTIME_FILE_IGNORED",
                            config_path,
                            "packOptions.ignore 会排除运行必需文件",
                            f"{matched} 命中 {rule!r}",
                            "环境准备",
                        )
                        break
        includes = pack_options.get("include", [])
        if isinstance(includes, list):
            for rule in includes:
                if not isinstance(rule, dict) or str(rule.get("type", "")).lower() not in {"file", "folder"}:
                    continue
                value = str(rule.get("value", "")).replace("\\", "/").strip("/")
                candidates = (
                    self.project_root.joinpath(*PurePosixPath(value).parts),
                    mini_root.joinpath(*PurePosixPath(value).parts),
                )
                if value and not any(candidate.exists() for candidate in candidates):
                    self.add(
                        "WARNING",
                        "PACK_INCLUDE_MISSING",
                        config_path,
                        "packOptions.include 指向不存在的文件或目录",
                        repr(rule),
                        "环境准备",
                    )

    def run(self) -> list[Finding]:
        project_config_path = self.project_root / "project.config.json"
        project_config = self.read_json(project_config_path, "PROJECT_CONFIG_MISSING_OR_INVALID", "环境准备")
        if project_config is None:
            return self.findings

        mini_root_raw = project_config.get("miniprogramRoot", ".")
        mini_root = self.configured_path(self.project_root, mini_root_raw) or self.project_root
        if not mini_root.is_dir():
            self.add(
                "ERROR",
                "MINIPROGRAM_ROOT_MISSING",
                project_config_path,
                "miniprogramRoot 指向的目录不存在",
                repr(mini_root_raw),
                "环境准备",
            )
            return self.findings

        app_json = mini_root / "app.json"
        app_config = self.read_json(app_json, "APP_CONFIG_MISSING_OR_INVALID", "开发")
        if app_config is None:
            return self.findings

        page_configs: list[Path] = [app_json]
        pages = app_config.get("pages", [])
        if not isinstance(pages, list):
            self.add("ERROR", "PAGES_INVALID", app_json, "app.json.pages 必须是数组", repr(pages), "开发")
        else:
            for route in pages:
                if not isinstance(route, str):
                    self.add("ERROR", "PAGE_ROUTE_INVALID", app_json, "页面路径必须是字符串", repr(route), "开发")
                    continue
                page_json = self.validate_page(mini_root, route, "app.json.pages")
                if page_json:
                    page_configs.append(page_json)

        subpackages = app_config.get("subPackages", app_config.get("subpackages", []))
        if subpackages is not None and not isinstance(subpackages, list):
            self.add("ERROR", "SUBPACKAGES_INVALID", app_json, "subPackages 必须是数组", repr(subpackages), "开发")
        elif isinstance(subpackages, list):
            for package_index, package in enumerate(subpackages):
                if not isinstance(package, dict) or not isinstance(package.get("root"), str) or not isinstance(package.get("pages"), list):
                    self.add("ERROR", "SUBPACKAGE_INVALID", app_json, "分包必须包含字符串 root 和数组 pages", f"索引 {package_index}", "开发")
                    continue
                for route in package["pages"]:
                    if not isinstance(route, str):
                        self.add("ERROR", "PAGE_ROUTE_INVALID", app_json, "分包页面路径必须是字符串", repr(route), "开发")
                        continue
                    full_route = f"{package['root'].strip('/')}/{route.strip('/')}"
                    page_json = self.validate_page(mini_root, full_route, f"subPackages[{package_index}]")
                    if page_json:
                        page_configs.append(page_json)

        self.validate_tabbar(mini_root, app_config, app_json)
        self.validate_components(mini_root, page_configs)

        calls = self.find_cloud_function_calls(mini_root)
        cloud_root_raw = project_config.get("cloudfunctionRoot")
        cloud_root = self.configured_path(self.project_root, cloud_root_raw)
        if cloud_root_raw and (cloud_root is None or not cloud_root.is_dir()):
            self.add("ERROR", "CLOUD_ROOT_MISSING", project_config_path, "cloudfunctionRoot 指向的目录不存在", repr(cloud_root_raw), "环境准备")
        if calls and cloud_root is None:
            self.add(
                "ERROR",
                "CLOUD_ROOT_NOT_CONFIGURED",
                project_config_path,
                "代码引用云函数，但 project.config.json 没有 cloudfunctionRoot",
                ", ".join(sorted(calls)),
                "环境准备",
            )
        elif cloud_root is not None and cloud_root.is_dir():
            for name, source_files in sorted(calls.items()):
                if not (cloud_root / name).is_dir():
                    self.add(
                        "ERROR",
                        "CLOUD_FUNCTION_MISSING",
                        cloud_root / name,
                        f"代码引用的云函数 {name} 不存在",
                        ", ".join(self.display_path(path) for path in source_files),
                        "环境准备",
                    )

        self.validate_pack_options(project_config, project_config_path, mini_root)
        return self.findings


def validate(project_root: Path) -> tuple[int, list[Finding]]:
    validator = Validator(project_root)
    findings = validator.run()
    return (1 if any(item.level == "ERROR" for item in findings) else 0), findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_root", type=Path, help="包含 project.config.json 的项目根目录")
    args = parser.parse_args(argv)
    code, findings = validate(args.project_root)
    for item in findings:
        print(f"{item.level} [{item.code}] {item.location}: {item.message}")
        print(f"  证据：{item.evidence}")
        print(f"  返回阶段：{item.return_stage}")
    error_count = sum(item.level == "ERROR" for item in findings)
    warning_count = sum(item.level == "WARNING" for item in findings)
    result = "PASS" if code == 0 else "FAIL"
    print(f"RESULT: {result} ({error_count} errors, {warning_count} warnings)")
    return code


if __name__ == "__main__":
    sys.exit(main())
