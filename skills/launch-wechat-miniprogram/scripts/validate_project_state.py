#!/usr/bin/env python3
"""Check mini program project records for contradictory current-state claims."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REQUIRED_DOCS = (
    "project-plan.md",
    "progress.md",
    "decisions.md",
    "test-report.md",
    "release-checklist.md",
)
EMPTY_VALUES = {
    "",
    "无",
    "暂无",
    "不适用",
    "未填写",
    "未设置",
    "未确认",
    "未开始",
    "待确认",
    "待验证",
    "todo",
}
VERSION_RE = re.compile(r"\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b")


def parse_fields(content: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if line.startswith("-"):
            line = line[1:].strip()
        match = re.match(r"^([^：:]+)[：:]\s*(.*)$", line)
        if match:
            fields.setdefault(match.group(1).strip(), match.group(2).strip())
    return fields


def field(fields: dict[str, str], *names: str) -> str:
    for name in names:
        value = fields.get(name, "").strip()
        if value:
            return value
    return ""


def meaningful(value: str) -> bool:
    clean = value.strip().strip("`")
    if clean in EMPTY_VALUES:
        return False
    if " / " in clean and not re.search(r"\d", clean):
        return False
    return bool(clean)


def checkbox(content: str, label: str) -> bool | None:
    pattern = re.compile(
        rf"^\s*-\s*\[([ xX])\]\s*{re.escape(label)}(?:\s|$|[（(])",
        re.MULTILINE,
    )
    match = pattern.search(content)
    if not match:
        return None
    return match.group(1).lower() == "x"


def section_value(content: str, heading: str) -> str:
    lines = content.splitlines()
    for index, line in enumerate(lines):
        if line.strip() != f"## {heading}":
            continue
        for candidate in lines[index + 1 :]:
            stripped = candidate.strip()
            if stripped.startswith("## "):
                return ""
            if stripped and not stripped.startswith("<!--"):
                return stripped
    return ""


def is_complete(value: str) -> bool:
    return meaningful(value) and bool(re.search(r"已完成|已通过|已发布|\b完成\b|\b通过\b", value))


def version(value: str) -> str:
    match = VERSION_RE.search(value)
    if not match:
        return ""
    return match.group(0).split("-", 1)[0]


def env_id(value: str) -> str:
    clean = value.strip().strip("`")
    clean = re.split(r"[（(]", clean, maxsplit=1)[0].strip()
    match = re.search(r"[A-Za-z0-9][A-Za-z0-9_-]{2,}", clean)
    return match.group(0) if match else ""


def check_milestone(
    errors: list[str],
    warnings: list[str],
    name: str,
    plan_complete: bool,
    progress_value: bool | None,
    release_value: bool | None = None,
) -> None:
    states = [("project-plan.md", plan_complete)]
    if progress_value is not None:
        states.append(("progress.md", progress_value))
    if release_value is not None:
        states.append(("release-checklist.md", release_value))
    if len({state for _, state in states}) > 1:
        rendered = ", ".join(f"{source}={'完成' if state else '未完成'}" for source, state in states)
        errors.append(f"{name}状态不一致：{rendered}")
    elif not plan_complete and any(state for _, state in states[1:]):
        warnings.append(f"{name}已在清单勾选，但 project-plan.md 没有完成记录")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate docs/miniapp state consistency without modifying files."
    )
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    docs_dir = project_dir / "docs" / "miniapp"
    errors: list[str] = []
    warnings: list[str] = []

    if not project_dir.is_dir():
        print(f"ERROR: project directory does not exist: {project_dir}")
        return 1
    if not docs_dir.is_dir():
        print(f"ERROR: project state directory does not exist: {docs_dir}")
        return 1

    contents: dict[str, str] = {}
    for name in REQUIRED_DOCS:
        path = docs_dir / name
        if not path.is_file():
            errors.append(f"缺少项目状态文件：docs/miniapp/{name}")
            continue
        contents[name] = path.read_text(encoding="utf-8")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    fields = {name: parse_fields(content) for name, content in contents.items()}
    plan = fields["project-plan.md"]
    progress = fields["progress.md"]
    test = fields["test-report.md"]
    release = fields["release-checklist.md"]

    env_sources = {
        "project-plan.md": env_id(
            field(plan, "腾讯云环境编号（EnvId）", "腾讯云环境编号", "CloudBase EnvId")
        ),
        "progress.md": env_id(field(progress, "当前 EnvId", "腾讯云环境编号（EnvId）")),
        "test-report.md": env_id(
            field(test, "后台环境编号（EnvId）", "后台环境", "腾讯云环境编号（EnvId）")
        ),
    }
    present_envs = {source: value for source, value in env_sources.items() if value}
    if len(set(present_envs.values())) > 1:
        errors.append(
            "当前 EnvId 不一致："
            + ", ".join(f"{source}={value}" for source, value in present_envs.items())
        )

    name_sources = {
        "project-plan.md": field(plan, "腾讯云环境名称", "环境名称"),
        "progress.md": field(progress, "当前环境名称", "腾讯云环境名称"),
        "test-report.md": field(test, "后台环境名称", "腾讯云环境名称"),
    }
    present_names = {
        source: value.strip().strip("`")
        for source, value in name_sources.items()
        if meaningful(value)
    }
    if len(set(present_names.values())) > 1:
        errors.append(
            "当前环境名称不一致："
            + ", ".join(f"{source}={value}" for source, value in present_names.items())
        )

    backend = field(plan, "后台方案")
    stage = section_value(contents["progress.md"], "当前阶段")
    cloudbase_active = meaningful(backend) and ("腾讯云" in backend or "CloudBase" in backend)
    cloud_stage = bool(re.search(r"开发|发布", stage))
    canonical_env = next(iter(present_envs.values()), "")
    canonical_name = next(iter(present_names.values()), "")
    if canonical_env and canonical_name and canonical_env.lower() == canonical_name.lower():
        errors.append("环境名称和 EnvId 被记录成同一个值；必须分别记录，例如 prod 与 prod-xxxx")
    if cloudbase_active and cloud_stage:
        if not canonical_name:
            errors.append("开发/发布阶段使用腾讯云后台，但没有单独记录环境名称")
        if not canonical_env:
            errors.append("开发/发布阶段使用腾讯云后台，但没有记录完整 EnvId")
        elif "-" not in canonical_env or len(canonical_env) < 8:
            errors.append(f"EnvId 看起来像环境名称或不完整编号：{canonical_env}")

        plan_verified = "已验证" in field(plan, "EnvId 验证状态")
        progress_verified = "已验证" in field(progress, "EnvId 验证状态")
        test_method = field(test, "EnvId 验证方式")
        if not plan_verified or not progress_verified or not meaningful(test_method):
            errors.append(
                "EnvId 硬门禁记录不完整：project-plan、progress 需写已验证，"
                "test-report 需记录只读诊断方式"
            )

    check_milestone(
        errors,
        warnings,
        "隐私资料",
        is_complete(field(plan, "隐私保护指引")),
        checkbox(contents["progress.md"], "隐私资料"),
        checkbox(contents["release-checklist.md"], "隐私保护指引"),
    )
    check_milestone(
        errors,
        warnings,
        "小程序备案",
        is_complete(field(plan, "备案状态")),
        checkbox(contents["progress.md"], "小程序备案"),
        checkbox(contents["release-checklist.md"], "备案状态"),
    )
    check_milestone(
        errors,
        warnings,
        "体验版测试",
        is_complete(field(plan, "体验版状态")),
        checkbox(contents["progress.md"], "体验版测试"),
    )

    review_submitted = bool(
        checkbox(contents["progress.md"], "提交审核")
        or checkbox(contents["release-checklist.md"], "提交审核")
    )
    if review_submitted:
        review_gates = (
            "已申报功能从首页直达或两次点击内可达",
            "测试账号或游客体验已准备",
            "当前代码隐私接口与平台隐私保护指引逐项一致",
            "没有强制或诱导分享、关注、添加账号、下载后使用",
            "审核员完整体验演练",
        )
        missing_gates = [
            label
            for label in review_gates
            if checkbox(contents["release-checklist.md"], label) is not True
        ]
        if missing_gates:
            errors.append("已经标记提交审核，但审核门禁未完成：" + "、".join(missing_gates))

    online_value = field(plan, "线上正式版本", "正式版本")
    online_version = version(online_value)
    plan_published = bool(online_version and ("已发布" in online_value or "线上" in online_value))
    check_milestone(
        errors,
        warnings,
        "正式发布",
        plan_published,
        checkbox(contents["progress.md"], "正式发布"),
        checkbox(contents["release-checklist.md"], "正式发布"),
    )

    development_value = field(progress, "开发中版本") or field(test, "版本")
    development_version = version(development_value)
    if online_version and development_version and online_version != development_version:
        change_path = docs_dir / "version-change.md"
        if not change_path.is_file():
            errors.append(
                f"线上版本为 {online_version}、开发中版本为 {development_version}，"
                "但缺少 docs/miniapp/version-change.md"
            )
        else:
            change_fields = parse_fields(change_path.read_text(encoding="utf-8"))
            target_version = version(field(change_fields, "目标版本"))
            confirmation = field(change_fields, "用户确认")
            if target_version != development_version:
                errors.append(
                    f"版本变更单目标版本为 {target_version or '空'}，"
                    f"与开发中版本 {development_version} 不一致"
                )
            if "版本变更确认" not in confirmation:
                errors.append("版本变更单尚未记录用户的“版本变更确认”")

    for warning in warnings:
        print(f"WARN: {warning}")
    for error in errors:
        print(f"ERROR: {error}")

    if errors or (args.strict and warnings):
        return 1
    if warnings:
        print(f"OK: no contradictions; {len(warnings)} warning(s)")
    else:
        print(f"OK: project state is consistent: {docs_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
