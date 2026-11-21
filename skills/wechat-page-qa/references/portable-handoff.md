# 跨 AI、新对话和新电脑的接手说明

此包包含操作规范、Windows 基础探测脚本、历史实测与异常处理规则。不包含微信开发者工具本体、登录态、令牌、小程序代码或历史截图；其他 AI 不需要读原聊天。

## 如何交给另一个 AI

支持技能导入的工具：把完整 `wechat-page-qa` 文件夹导入该工具认可的技能目录，不只复制 SKILL.md。目录以该 AI 的当前官方说明为准；不要猜另一个产品的安装目录。

不支持技能导入但能读本地文件的工具：让它完整读取 `SKILL.md` 和本说明，再按需读取其他相对链接。读取 Markdown 就能获取工作流程，不依赖 Codex 专用工具。

只有网页聊天、不能读本机的工具：上传完整包，或在用户同意下粘贴相关文档；它可以审查和指导，但不能声称已连接本机 IDE。安装技能不会自动赋予桌面、终端或截图能力。

可直接交给新 AI 的指令：

> 请读取这个技能包内的 SKILL.md 和 references/portable-handoff.md。我同意你按技能验证本次小程序页面：优先复用已开的微信开发者工具，只截模拟器内部画面，查看每张截图，遇到白屏或报错先读控制台；定位不明就停下来告诉我。不要上传、发布或提交真实交易。项目和页面路径先从当前工作区核对，能查到的信息不要重复问我。

## 接手时只补齐这些上下文

- 项目绝对路径与真实 checkout；读取项目内工作规则和 `project.config.json`、`app.json`，区分项目根目录和 `miniprogramRoot`。不要输出 appid、用户资料或密钥配置。
- 目标路由、预期状态、一个稳定选择器、要验证的无业务副作用交互，以及确认过的设计图（如有）。旧的本机示例路径不是默认目标。
- 截图目录：按当前工作区规则选择临时目录，必须绝对路径；不要写入小程序主包。
- 同项目窗口是否已打开，是否存在待确认的授权任务；超时不等于没开窗口。不能确定时问用户，不启动另一份工具。
- 实际 AI 产品名作为 clientName；不要照抄历史实测中的 Codex 身份。首次新产品授权由用户确认，不翻凭证、不改安全设置。

## 当前机器发现与官方参数

在终端查找 `wechatide`；路径不在环境变量中时，查已安装工具位置，或请用户提供。Windows 脚本可显式传 `-CliPath`。不要为整理安装位置重装、搬迁已有软件。

读取当前安装包的 `wechatide-skill/SKILL.md`（Windows 已测相对位置 `resources/app.asar.unpacked/wechatide-skill/SKILL.md`），按其运行前门禁和场景指南执行，再核对当前命令的 `--help`。安装结构或接口不同就停止套用旧脚本；不要修改安装包内容。

首次状态检查读取官方根技能的当前 version，传 `check_wechatide_status --skill-version`；确认 JSON `ok:true`、登录未过期、版本门禁通过。CLI 可选 token 与 MCP token 分开处理，按官方流程让用户在工具内授权。不把账号信息输出到报告。

命令执行必须处于有本机桌面访问权限的环境。若沙箱拦截，使用宿主的审批机制请求本次必要权限，不编造其他 AI 的权限参数，也不绕过限制。权限不获批就停止。

## 不依赖聊天的命令路线

以下是本机已核对的工具名与参数形状，`CLIENT`、`PROJECT` 等均需替换；升级后仍以本机 `--help` 为准。不要把这一串机械执行，尤其不要在已开窗口时再次开窗。

```text
wechatide -c CLIENT check_wechatide_status --skill-version VERSION
wechatide -c CLIENT automation_runtime_info --project PROJECT --action currentPage
```

已有窗口只复用。确实没有目标项目窗口时才调用一次：

```text
wechatide -c CLIENT open_project_window --project PROJECT --window-mode fullMode
```

需要切页时用 `simulator_open_page --project PROJECT --page ROUTE`，之后重新读取 currentPage。路径相对于小程序根目录；不要把 CLI success 当作已进入目标页。

```text
wechatide -c CLIENT compile_wxml --project PROJECT --file-path ROUTE.wxml
wechatide -c CLIENT compile_wxss --project PROJECT --file-path ROUTE.wxss
wechatide -c CLIENT automation_page_action --project PROJECT --action getData --data-path FIELD
wechatide -c CLIENT automation_element_action --project PROJECT --action tap --selector SELECTOR
wechatide -c CLIENT automation_page_action --project PROJECT --action getData --data-path FIELD
wechatide -c CLIENT simulator_screenshot --project PROJECT --wait-for-selector SELECTOR --path ABSOLUTE.jpg
wechatide -c CLIENT get_simulator_console --project PROJECT --command "grep -i error"
```

两个 compile 命令只诊断模板与样式编译产物，不等于全包运行编译。tap 只能用于用户已授权的安全控件；先读状态，再点击，再读状态并比较，必要时恢复。不要点击付款、退款、审核等真实业务按钮验证工具。

每次截图必须用宿主的图片查看工具打开。如只有文件读取、没有视觉查看能力，记录“已产出截图，视觉未验收”，让用户确认，不推断图片正常。错误过滤无结果时可读 `grep -n .` 上下文；只保留脱敏的相关片段。

Windows 可运行 `scripts/probe-page.ps1` 省去基础探测重复劳动；它不执行点击、不判定视觉、不证明业务。`-Approved` 表示已有本次用户同意，不是授权绕过。`-OpenIfConfirmedAbsent` 只有确认窗口不存在后才可用。参数 `ClientName` 不传会要求补齐，不能默认冒充 Codex。

## 异常与停止

- 控制命令返回 pending/taskId：按本机官方异步规则处理，保留原任务，不重复发起。授权或扫码未完成不能算已连接。
- 超时、空页栈或 `rawPath ... null`：先读控制台、编译证据与逻辑层页栈；仅在确认同项目会话存在且符合 SKILL.md 的恢复条件时允许一次刷新及明确路径 reLaunch。仍失败则停。
- 图片为空白、编译中或错误页：保留失败图，读取控制台；任务授权修复且原因明确才最小修改、重编译并重新截图。否则向用户报告，不继续重复开窗。
- 用户正在使用该 IDE 编辑代码或填写未保存内容时，导航/刷新也可能打断工作。先协调，不因为用户批准截图就丢弃其工作。

## 交付必须分清

分别报告连接、实际路由、局部编译、真实点击及状态变化、截图人工视觉检查。每项给通过/失败/未测；附图片绝对路径、日志脱敏摘要和剩余阻碍。将真机、真实账号、支付退款、云端部署单列为未验证，除非有真实证据。

本包已在 Windows 当前工具和 Codex 终端中验证；未在其他 AI、macOS 或 Linux 上执行过。跨 AI 复用的是同一套开放 CLI 操作规范，不是对所有宿主权限和安装版本的保证。
