# 项目状态持久化

## 文件

在项目根目录使用：

```text
docs/miniapp/project-plan.md
docs/miniapp/progress.md
docs/miniapp/decisions.md
docs/miniapp/version-change.md
docs/miniapp/design-system.md
docs/miniapp/prototype/index.html
docs/miniapp/test-report.md
docs/miniapp/release-checklist.md
```

新项目在用户确认需求并同意建立项目记录后，才把 `assets/project-docs/` 的 Markdown 模板复制到 `docs/miniapp/`；需求确认前只在对话中收集信息，不写文件。不要覆盖用户已有内容。

## 读取顺序

每次恢复任务先运行：

```powershell
python scripts/validate_project_state.py <project-root>
```

再读 `project-plan.md`、`progress.md`、`decisions.md`；项目已有线上版本或正在更新时同时读 `version-change.md`、`test-report.md` 和 `release-checklist.md`。然后输出：当前阶段、线上版本、开发中版本、当前环境名称和完整 EnvId、已完成、阻塞、唯一下一步和完成标准。脚本报告错误或聊天与文件冲突时，先列出冲突并要求用户确认事实，再更新相关文件；不要静默选择其中一份记录。

## 更新规则

- 用户确认需求、首版范围、UI 方案或原型：分别更新规划与设计阶段进度，不要一次勾选后续门禁。
- 用户完成账号、AppID、开发工具、备案或腾讯云步骤：更新环境清单。
- 用户选择后台、UI、主体、类目、登录或支付：在 `decisions.md` 记录选择、原因、风险和确认日期。
- 已上线项目增加或修改功能：先更新 `version-change.md`，分别记录线上版本和开发中版本；用户确认版本变更单后才编码。
- 每个开发任务和测试结果：更新进度和测试报告。
- 上传、体验、审核、发布：更新发布清单；审核通过不等于正式发布。
- 审核准备：记录核心功能路径、点击次数、测试账号是否已准备、角色、入口和验证日期；不记录账号、密码、验证码或其他登录凭据。
- 隐私与兼容审查：记录实际隐私接口、第三方服务、旧登录接口、前端 openid 和支付签名扫描结果；发现的秘密信息只记录位置和处置状态，不复制秘密值。
- 环境信息：把环境名称、完整 EnvId、验证方式和验证日期分开记录；不得把 `prod`、`test` 等环境名称写成 EnvId。
- 状态只用 `todo`、`in_progress`、`blocked`、`done`、`skipped`，同时保留 Markdown 复选框供用户查看。

每次完成需求/版本确认、EnvId 验证、体验版、审核或正式发布后重新运行状态一致性脚本。脚本退出码非 0 时，先修正项目记录再推进；脚本只读取文件，不自动覆盖用户内容。

## 敏感信息

允许记录 AppID、腾讯云环境编号、非秘密域名和版本号。禁止记录登录或审核测试账号、密码、验证码、AppSecret、SecretId、SecretKey、API Key、支付密钥、身份证号码和证件图片。也就是禁止记录密码和其他秘密值。用户发送截图时提醒打码。
