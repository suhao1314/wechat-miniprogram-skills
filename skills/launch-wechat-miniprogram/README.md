# launch-wechat-miniprogram

面向完全新手的微信小程序 Agent Skill：从想法开始，经过需求确认、原生 UI 方案、高保真原型、账号与 AppID、备案、开发测试、可选腾讯云后台、体验版、审核门禁、发布和版本更新，逐阶段推进到可验收结果。

这个 Skill 只覆盖微信小程序，不默认使用腾讯云后台，也不会替用户注册账号、填写实名资料、扫码、提交审核或输入密码等敏感信息。

## 解决什么问题

新手通常不是不会写几行代码，而是不知道应该先确认什么、哪些信息不能假设、什么时候需要 AppID、备案和后台，以及 HTML 原型和真实小程序之间有什么差异。这个 Skill 把流程固定成四个阶段，并设置明确的确认门禁：

```mermaid
flowchart LR
    A[设计\n需求 -> MVP -> 三套小程序 UI -> 高保真原型] --> B[环境准备\n账号 -> AppID -> 工具 -> 备案 -> 后台判断]
    B --> C[开发\nWXML/WXSS -> 数据 -> 登录权限 -> 模拟器与真机测试]
    C --> D[发布\n上传 -> 体验版 -> 提审 -> 发布 -> 更新]
```

每个阶段只推进一个明确任务。用户没有确认需求、首版范围或设计方案前，Skill 不会创建源码或跳过门禁直接开工。

## 核心特点

- 需求先行：产品名称不等于完整需求，先询问业务规则、参与方式、数据保留和首版目标。
- 大白话引导：用“换手机还能看到吗”“别人要一起看吗”判断是否需要在线后台。
- 小程序原生设计：三套手机框方案统一显示微信胶囊、顶部避让、底部安全区和真实底部导航。
- 可落地门禁：核心视觉必须能映射到 WXML/WXSS、原生组件、WeUI、TDesign MiniProgram、Vant Weapp 或本地图片。
- `tabBar` 约束：原生底部栏的图标使用项目内本地 PNG；自定义底栏需要明确额外开发和测试成本。
- 已有项目盘点：修改前读取页面、分包、导航、根目录、云函数、插件、组件库、主题和后台方式，区分可见功能、基础设施、管理能力、高风险能力和未知项。
- 样式继承：局部更新默认沿用现有颜色、字号、间距、圆角、图片比例、组件和页面结构；整体改版才重新走三套方案。
- 确定性产物校验：只读脚本检查配置、缺页、分包、本地组件、`tabBar` PNG、云函数和明显打包遗漏，并给出修复阶段。
- 分级验证：L1 静态到 L7 正式环境逐级记录，不能用编译或模拟器结果冒充真机、体验版或线上结果。
- 危险操作门禁：支付、退款、真实订单、注销、删除、清空和真实通知默认安全跳过，只有具体目标和环境获得单项授权后才执行。
- 开发闭环：记录基础库与打包范围，明确页面状态生命周期和分享冷启动，云端写入重复校验，代码审查按阻塞/建议/可选/通过分级。
- 审核专项：检查审核员可达路径、测试账号、隐私接口一致性、诱导分享/关注、完整产品、退出账号、用户内容和第三方服务。
- 旧项目迁移：能识别 `wx.getUserInfo`、旧 `wx.getUserProfile`、前端 openid 和固定 MD5 支付签名，但只作为迁移反例，不作为新项目模板。
- 动态规则核验：个人主体、交易、金融、医疗、教育、虚拟服务和平台支付限制执行前重新查看当前官方页面，不写死历史结论。
- 状态持久化：把规划、进度、决策、版本变更、测试和发布检查保存到项目的 `docs/miniapp/`。
- 腾讯云可选：只有用户确实需要跨设备数据、多人共享、上传、身份或后台程序时才引导腾讯云，并先确认费用和额外步骤。
- 人在回路：实名、短信、扫码、权限确认、审核提交和正式发布由用户在官方平台完成。

## 设计门禁

首版范围确认后，Skill 从六个内部构思中挑选三种适合当前任务的信息布局方向，按[布局方向参考](references/mobile-design-directions.md)制作轻量方案。三种方案使用同一套微信小程序组件、页面、数据、文案和功能范围，只比较信息布局；不再固定成原生、品牌、差异化三种模板。局部功能调整和缺陷修复沿用现有样式，不套三方案流程。

用户选定后，先按原尺寸看图修正拥挤、信息层级、换行和触控布局，再打开修正版复核；原型确认并开发出可运行页面后，在获准使用的微信开发者工具中逐页走查真实小程序页面的主要任务与状态。没有实际查看/运行的步骤标为未验证。HTML 用于确认设计方向，不能替代微信实页验收。

## 安装

见[发布仓库的快速开始](https://github.com/suhao1314/wechat-miniprogram-skills#readme)。安装 skills/launch-wechat-miniprogram，需要自动截图时加装同级 skills/wechat-page-qa。新对话输入 `$launch-wechat-miniprogram` 开始。

## 使用示例

```text
我想做一个打牌记账器小程序。
```

首轮不会假设四个人、固定玩法、本地存储或“不需要登录”，而是先询问玩法、记账单位、是否多人查看、是否需要换手机保留以及首版最重要结果。确认后才会继续到 UI 方案和原型。

## 项目文件

使用过程中，Skill 会在用户确认需求并同意建立项目记录后初始化：

```text
docs/miniapp/
├── project-plan.md       # 产品、首版范围、设计、环境和发布规划
├── progress.md           # 当前阶段和逐项进度
├── decisions.md          # 重要选择及原因
├── version-change.md     # 已上线版本的变更单
├── test-report.md        # 模拟器、真机、弱网和权限测试
└── release-checklist.md  # 体验版、审核和发布检查
```

项目文件只记录 AppID、腾讯云环境编号、非秘密域名和版本号等非敏感标识。不要把密码、验证码、AppSecret、API Key、支付密钥、身份证号码或证件图片写进项目。

## 包含内容

```text
launch-wechat-miniprogram/
├── SKILL.md
├── agents/openai.yaml
├── references/
│   ├── design-stage.md
│   ├── miniprogram-ui-adapter.md
│   ├── environment-stage.md
│   ├── development-stage.md
│   ├── release-stage.md
│   ├── version-update.md
│   ├── state-persistence.md
│   ├── acceptance-tests.md
│   ├── official-links.md
│   └── ...
├── assets/project-docs/
├── scripts/
│   ├── init_project_state.py
│   ├── validate_miniprogram_artifacts.py
│   ├── validate_project_state.py
│   └── validate_skill.py
└── tests/
    └── test_validate_miniprogram_artifacts.py
```

社区 Skill、组件库和案例只作为参考，不直接复制第三方文本、库源码或远程 CDN。历史登录、支付和主体限制示例只用于发现旧代码与风险；平台规则、服务类目、价格、备案和审核要求执行前应重新打开官方页面核验。

## 本地验证

在 Skill 目录运行：

```powershell
python scripts/validate_skill.py .
python scripts/validate_skill.py . --check-links
python -m unittest discover -s tests -v
```

验证一个已有项目的状态文件：

```powershell
python scripts/validate_project_state.py <project-root>
```

只读检查一个小程序项目的确定性产物：

```powershell
python scripts/validate_miniprogram_artifacts.py <project-root>
```

该命令通过只代表 L1 静态证据，不能替代开发者工具编译、模拟器、安卓/iPhone 真机、体验版或正式环境验证。

## 重要官方入口

- [微信公众平台](https://mp.weixin.qq.com/)
- [微信小程序设计指南](https://developers.weixin.qq.com/miniprogram/design/)
- [微信开发者工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- [小程序备案操作指引（登录微信公众平台后查看）](https://mp.weixin.qq.com/)
- [小程序平台常见拒绝情形](https://developers.weixin.qq.com/miniprogram/product/reject.html)
- [用户隐私保护指引](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)
- [腾讯云开发 CloudBase](https://docs.cloudbase.net/)
- [TDesign MiniProgram](https://tdesign.tencent.com/miniprogram/overview)

## 许可证

本目录保留 niuhuoshan 的[上游 MIT 声明](LICENSE)。本版新增的原创内容适用 PolyForm Noncommercial 1.0.0，第三方组件和素材各按其授权使用。[本版许可说明](LICENSE-NOTICE.md)
