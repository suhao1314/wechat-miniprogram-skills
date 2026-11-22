#!/usr/bin/env python3
"""Validate the launch-wechat-miniprogram skill and optionally check official URLs."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REQUIRED_FILES = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/official-links.md",
    "references/design-stage.md",
    "references/mobile-design-directions.md",
    "references/miniprogram-ui-adapter.md",
    "references/environment-stage.md",
    "references/tencent-cloud-choice.md",
    "references/development-stage.md",
    "references/release-stage.md",
    "references/operations-and-revenue.md",
    "references/native-field-guide.md",
    "references/skill-comparison.md",
    "assets/signup-demo/project.config.json",
    "assets/signup-demo/pages/ui-cases/index.wxml",
    "assets/qa-module/README.md",
    "scripts/verify-signup-devtools.ps1",
    "references/version-update.md",
    "references/state-persistence.md",
    "references/acceptance-tests.md",
    "references/source-process.md",
    "assets/project-docs/project-plan.md",
    "assets/mobile-directions.html",
    "assets/project-docs/progress.md",
    "assets/project-docs/decisions.md",
    "assets/project-docs/version-change.md",
    "assets/project-docs/test-report.md",
    "assets/project-docs/release-checklist.md",
    "scripts/init_project_state.py",
    "scripts/validate_miniprogram_artifacts.py",
    "scripts/validate_project_state.py",
    "tests/test_validate_miniprogram_artifacts.py",
]

REQUIRED_PHRASES = [
    "设计",
    "环境准备",
    "开发",
    "发布",
    "高保真 HTML 原型",
    "progress.md",
    "腾讯云后台",
    "miniprogram-development",
    "cloudbase-code-review",
    "截图或报错文字",
    "不要把 HTML 原型宣称为最终小程序效果",
    "state-persistence.md",
    "需求信息收齐",
    "首版范围确认",
    "UI 方案确认",
    "miniprogram-ui-adapter.md",
    "不得把通用 Web UI Skill 作为默认设计来源",
    "三套",
    "WXML/WXSS 可落地检查",
    "本地 PNG",
    "仅有“帮我做”“开始做”或产品名称，不构成跳过门禁的授权",
    "userask",
    "结构化提问工具",
    "立即回退为编号文字",
    "version-update.md",
    "validate_project_state.py",
    "我操作",
    "你操作",
    "高影响字段",
    "基础库版本",
    "状态生命周期",
    "onShareAppMessage",
    "所有云端写入校验",
    "阻塞 / 建议 / 可选 / 通过",
    "旧 `wx.getUserInfo`",
    "前端保存/上传 openid",
    "固定 MD5 支付签名",
    "审核员可从首页直达或两次点击内",
    "隐私接口与平台隐私保护指引一致",
    "诱导分享",
    "个人小程序不能做某类业务",
    "最小源码盘点",
    "validate_miniprogram_artifacts.py",
    "L1 静态",
    "安全跳过",
    "继承现有样式",
]

CONTENT_ASSERTIONS = {
    "references/design-stage.md": [
        "高保真 HTML 原型",
        "最终以开发者工具和真机为准",
        "需求确认前禁止",
        "docs/miniapp/ui-options/index.html",
        "打牌记账器",
        "六个构思",
        "同一套已选微信小程序组件",
        "原尺寸查看选中方案",
        "逐页走查主要任务和状态",
        "WXML/WXSS 可落地检查",
        "375px 或 390px",
        "本地 PNG",
        "等价结构化提问工具",
        "没有该工具",
        "外部资料与业务数据",
        "置信度",
        "高影响字段",
        "不得静默编造",
    ],
    "references/environment-stage.md": [
        "新建项目",
        "导入项目",
        "project.config.json",
        "用户换一台手机后",
        "服务器域名",
        "业务域名",
        "小程序备案操作指引",
        "EnvId 硬门禁",
        "环境名称",
        "完整 EnvId",
        "wx.cloud.callFunction",
        "不会自动创建缺失的数据库集合",
        "libVersion",
        "packOptions.ignore",
        "packOptions.include",
        "个人小程序不能做电商、金融、医疗、教育",
        "当前账号可选择的服务类目",
        "核验日期和官方页面",
    ],
    "references/tencent-cloud-choice.md": [
        "创建前明确目标环境、费用与授权",
        "官方计费说明",
        "0 元/月",
        "19.9 元/月",
        "199 元/月",
        "不得编造价格",
    ],
    "references/development-stage.md": [
        "getWXContext()",
        "chooseAvatar",
        "input type=\"nickname\"",
        "拒绝授权",
        "cloudbase-code-review",
        "iconPath",
        "selectedIconPath",
        "本地 PNG",
        "云端资源预检表",
        "安卓真机",
        "iPhone 真机",
        "窄屏",
        "长昵称",
        "字体放大",
        "微信身份会由小程序和腾讯云后台自动识别",
        "头像和昵称必须由用户主动选择或填写",
        "手机号是另一项独立授权",
        "基础库与打包边界",
        "状态生命周期与分享边界",
        "分享目标依赖发送者本机缓存",
        "云端写入校验",
        "onShareAppMessage",
        "onShareTimeline",
        "代码审查分级与改动边界",
        "阻塞",
        "建议",
        "可选",
        "通过",
        "旧登录接口兼容审查",
        "wx.getUserInfo",
        "wx.getUserProfile",
        "前端 openid 反例",
        "wx.setStorageSync('openid'",
        "支付实现与旧 MD5 签名审查",
        "signType: 'MD5'",
        "商户密钥、API 密钥、证书和私钥只存在于可信服务端",
        "已有项目最小源码盘点",
        "用户可见功能",
        "小程序产物确定性校验",
        "验证证据等级",
        "L7",
        "危险操作默认安全跳过",
    ],
    "references/release-stage.md": [
        "体验成员",
        "体验二维码",
        "提交审核",
        "正式发布",
        "上传代码、开发版本、体验版",
        "version-update.md",
        "validate_project_state.py",
        "实际打包范围",
        "分享给朋友",
        "分享到朋友圈",
        "阻塞级",
        "审核专项门禁",
        "审核员可达性和测试账号",
        "首页直达或两次点击内",
        "隐私接口与平台指引一致",
        "诱导分享、关注和外部导流",
        "完整产品和账号闭环",
        "用户内容安全和第三方服务",
        "交易、虚拟服务和主体限制",
        "旧登录与支付代码扫描",
        "发布证据等级",
        "危险操作发布门禁",
    ],
    "references/state-persistence.md": [
        "project-plan.md",
        "progress.md",
        "decisions.md",
        "version-change.md",
        "validate_project_state.py",
        "禁止记录密码",
    ],
    "assets/project-docs/project-plan.md": [
        "外部业务资料来源",
        "高影响字段确认状态",
        "基础库版本（libVersion）",
        "状态与分享",
        "分享冷启动重建方式",
        "已有项目盘点",
        "小程序产物校验",
    ],
    "assets/project-docs/test-report.md": [
        "基础库版本（libVersion）",
        "实际预览/上传范围验证",
        "分享给朋友与接收者冷启动",
        "云端输入、归属和重复请求校验",
        "代码审查",
        "审核员从首页进入核心功能",
        "隐私接口与平台保护指引一致",
        "前端保存/上传 openid 扫描",
        "固定 MD5 支付签名扫描",
        "验证证据等级",
        "危险操作与安全跳过",
    ],
    "assets/project-docs/release-checklist.md": [
        "基础库版本和兼容方式已记录",
        "实际预览/上传打包范围已验证",
        "分享给朋友及接收者冷启动",
        "云端写入校验",
        "阻塞级代码审查问题",
        "已申报功能从首页直达或两次点击内可达",
        "测试账号或游客体验已准备",
        "当前代码隐私接口与平台隐私保护指引逐项一致",
        "旧登录 API、前端 openid、前端密钥和固定 MD5 支付签名已扫描",
        "小程序产物确定性校验通过",
        "低等级证据代替高等级",
        "危险操作已安全跳过",
    ],
    "assets/project-docs/progress.md": [
        "通用代码审查",
        "腾讯云专项代码审查 / 不适用",
        "审核员可达路径和测试账号准备",
        "旧登录、openid 和支付签名扫描",
        "已有项目最小源码盘点",
        "验证证据等级和未验证项已记录",
        "危险操作安全跳过或单项授权已记录",
    ],
}


def extract_urls(path: Path) -> list[str]:
    return re.findall(r"https?://[^)\s>]+", path.read_text(encoding="utf-8"))


def skill_markdown(skill_dir: Path):
    return (path for path in skill_dir.rglob("*.md")
            if "node_modules" not in path.relative_to(skill_dir).parts)


def check_local_markdown_links(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    for markdown in skill_markdown(skill_dir):
        content = markdown.read_text(encoding="utf-8")
        for target in re.findall(r"\]\((?!https?://)([^)]+)\)", content):
            relative = target.split("#", 1)[0]
            if not relative:
                continue
            resolved = (markdown.parent / relative).resolve()
            if not resolved.exists():
                errors.append(f"broken local link in {markdown.relative_to(skill_dir)}: {target}")
    return errors


def check_structure(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_FILES:
        if not (skill_dir / relative).is_file():
            errors.append(f"missing file: {relative}")

    skill = skill_dir / "SKILL.md"
    if skill.is_file():
        content = skill.read_text(encoding="utf-8")
        if not content.startswith("---\n") or "\n---\n" not in content:
            errors.append("SKILL.md must have YAML frontmatter")
        frontmatter = content.split("\n---\n", 1)[0]
        if not re.search(r"^name:\s*launch-wechat-miniprogram\s*$", frontmatter, re.M):
            errors.append("frontmatter name is incorrect")
        if not re.search(r"^description:\s*.+", frontmatter, re.M):
            errors.append("frontmatter description is missing")
        for phrase in REQUIRED_PHRASES:
            if phrase not in content:
                errors.append(f"SKILL.md missing required phrase: {phrase}")

    for relative, phrases in CONTENT_ASSERTIONS.items():
        path = skill_dir / relative
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        for phrase in phrases:
            if phrase not in content:
                errors.append(f"{relative} missing behavior assertion: {phrase}")

    acceptance = skill_dir / "references" / "acceptance-tests.md"
    if acceptance.is_file():
        content = acceptance.read_text(encoding="utf-8")
        for number in range(1, 58):
            test_id = f"T{number:02d}"
            if test_id not in content:
                errors.append(f"acceptance test missing: {test_id}")

    for markdown in skill_markdown(skill_dir):
        content = markdown.read_text(encoding="utf-8")
        for phrase in (
            "优先读取 `ui-ux-pro-max`",
            "只有该 Skill 不存在时才读取 `ui-design`",
            "UI 设计优先使用 `ui-ux-pro-max`",
        ):
            if phrase in content:
                errors.append(
                    f"obsolete Web-first UI route in {markdown.relative_to(skill_dir)}: {phrase}"
                )

    links = skill_dir / "references" / "official-links.md"
    if links.is_file() and len(extract_urls(links)) < 20:
        errors.append("official-links.md must contain at least 20 verified URLs")
    errors.extend(check_local_markdown_links(skill_dir))
    return errors


def check_links(skill_dir: Path) -> list[str]:
    link_file = skill_dir / "references/official-links.md"
    errors: list[str] = []
    for url in extract_urls(link_file):
        request = Request(url, method="HEAD", headers={"User-Agent": "Codex-skill-link-check/1.0"})
        try:
            with urlopen(request, timeout=15) as response:
                status = response.status
        except HTTPError as error:
            status = error.code
        except (URLError, TimeoutError, OSError) as error:
            errors.append(f"{url}: {error}")
            continue
        if status < 200 or status >= 400:
            errors.append(f"{url}: HTTP {status}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("skill_dir", type=Path)
    parser.add_argument("--check-links", action="store_true")
    args = parser.parse_args()
    skill_dir = args.skill_dir.resolve()

    errors = check_structure(skill_dir)
    if args.check_links and not errors:
        errors.extend(check_links(skill_dir))
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"OK: {skill_dir}")
    if args.check_links:
        print("OK: official links")
    return 0


if __name__ == "__main__":
    sys.exit(main())
