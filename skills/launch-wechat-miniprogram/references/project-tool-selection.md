# 按项目需要调用工具

从用户要交付的结果选本阶段用得到的一项。先检查当前工程、已安装技能、现有测试和依赖锁；优先复用能解决同一问题的入口。CLI、浏览器库与给 AI 读的 Skill 分开识别。已有同等能力时直接用它，受环境限制时给出能执行的替代。选用第三方软件时按实际版本核对许可、资源和运行位置；开发工具放开发侧。验收记录写清运行对象、输入、实际输出与未验项。

## 找需求和首批用户

- 团队还不清楚谁会用时，采用 [PM Skills](https://github.com/phuryn/pm-skills) 的客户细分与假设验证思路。用一句话写清「哪类人，在什么情况下，现在怎样处理」。访谈先问最近一次真实经历及替代办法，选一个成本低的验证动作。交付的是原话、证据与下一次选择。一个明确的小工具可以直接沿用已确认需求。
- 有商家收入目标时，参考 [Marketing Skills](https://github.com/coreyhaines31/marketingskills) 的客户定位与定价方法。例如活动方愿不愿为核销名单付钱，先拿一场活动试，记录愿意试用、实际付费或拒绝的原因。[Marketing-for-Founders](https://github.com/edostro/marketing-for-founders) 可辅助定位访谈资料。已有结论接回[运营与收入验证](operations-and-revenue.md)。没有购买行为证据时把定价标作假设。
- 需要查公开资料且普通浏览难以整理多页时，用已授权的 Firecrawl 工具提取公开文档，留下原始 URL、日期和关键依据。有官方单页直接读原文即可。涉及外部调用时先看可用额度和数据范围。

## 开发、验收与交接

| 触发条件 | 调用及产物 | 复核边界 |
| --- | --- | --- |
| 原生页面改版；需要新手引导 | 用随包 [Pixelmatch 截图回归](visual-regression.md) 生成差异图；配套网页后台的引导沿用 [Driver.js 与原生 TDesign Guide 的分工](project-workflow.md)。 | 原生页面截图来自微信。对比后还要点按任务；引导允许跳过和重新进入。 |
| 报名、优惠、重复操作等规则有大量边界组合 | 用 [fast-check](https://fast-check.dev/docs/introduction/) 生成动作序列，检验业务不变量，保存失败种子、路径及缩小后的反例。报名可验同一人多次提交只留一条记录。 | 在 Node 测试中跑真实业务函数；共享后端并发、不同账号授权及真机单测另列。 |
| 商家 Web 后台反复出现状态多的组件 | [Storybook](https://storybook.js.org/docs/writing-stories) 为同一张订单卡提供已付款、空、加载失败等可单独打开的样例；需要让页面经历慢响应或错误时才加 [MSW](https://mswjs.io/docs/)。 | 固定输入和屏宽，检查失败重试、长标题和按钮。模拟响应只证明页面反应；真实服务接口另验。纯原生项目可用现有微信测试页和假数据。 |
| 后台有稳定的 HTTP 接口，或预约高峰有明确容量目标 | 先用 [Hurl](https://hurl.dev/docs/asserting-response.html) 验测试订单状态、响应字段和记录数。需要容量数据时才用 [Grafana k6](https://grafana.com/docs/k6/latest/using-k6/thresholds/) 在指定的隔离服务用合成数据，按预计峰值定负载、时长和停止阈值，输出错误率和延迟分位数。 | 接口功能与容量分别出证据。小项目没共享后端可跳过。k6 独立运行，避免触发真实支付、通知与产生账单的业务动作。 |
| 网页后台需要查性能、可访问性、废弃代码 | [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) 对同条件网页比较性能；[axe-core](https://github.com/dequelabs/axe-core) 定位标签、名称和对比度等可自动检查的问题；[Knip](https://github.com/webpro-nl/knip) 列出闲置依赖或导出的候选。 | 网页结果与微信性能分开报告；手动核对键盘与实际任务；清理前查路由、动态导入、云函数和 WXML 字符串引用。 |
| 网页长表单或社区富文本 | [Dexie.js](https://dexie.org/) 可按账户和草稿隔离浏览器 IndexedDB；微信端复用已有本地草稿逻辑。网页确需渲染外来 HTML 时，按允许的内容使用 [DOMPurify](https://github.com/cure53/DOMPurify) 清洗后渲染；纯文本直接按文本展示。 | 改账号后不能看到旧草稿；成功清理、失败保留。富文本渲染检查、服务端权限和内容审核分别验证。 |
| 现有图标缺字形，或批量生成活动分享卡 | 先查腾讯组件库；[Lucide](https://lucide.dev/) 可补少数风格相容的图标。[Satori](https://github.com/vercel/satori) 可在构建侧按模板生成 SVG，再用已有导出工具生成小写 png。 | 核对字体授权、中文长标题及最终文件体积。用微信分享卡预览；图标与图片生成依赖留在构建侧。 |
| 有单独公开的静态帮助中心 | [Linkinator](https://github.com/JustinBeckwith/linkinator) 查构建站点的链接及可发现的静态资源；文档量大且确有检索需求时，[Pagefind](https://pagefind.app/) 为公开页面建立索引。 | 图片是否显示正确另看渲染页面；索引只含公开内容。几页手册优先用导航，在微信原生搜索中采用项目已有实现。 |

### 重跑随包报名属性测试

在技能的 [tools/signup-property-tests](../tools/signup-property-tests/package.json) 目录依次运行 `npm ci --ignore-scripts` 和 `npm test`。每次生成 200 组两人编辑、模拟失败与提交的操作序列。测试用例调用随包报名服务，每步核对两人的草稿和报名总数。复现失败时，将报告的 seed 和 path 分别填入环境变量 `FC_SEED` 和 `FC_PATH` 再运行测试。这套可选开发依赖位于微信样板目录之外。

## 截图所列其余候选的取舍

以下项目记录在交付分支；有对应委托才转入文档、媒体或调研流程。

- 要求 Word 母版套填时可转 docxtpl；HTML 印刷排版可转 Paged.js；已有 PDF 的拆合排页可转 PDF Arranger；培训幻灯片可转 Marp CLI。
- 发布培训视频时，MediaInfo 用于核对交付规格，Auto-Editor 可做粗剪，Subtitle Edit 可作字幕校时。只有产品本身包含浏览器媒体编辑任务，才评估 Mediabunny。
- 收集首轮反馈优先沿用已有访谈或问卷。持续调研确需问卷平台时再评估 Formbricks 的部署和维护成本。Agency Agents 的角色清单只作团队分工参考，已有负责人和验收项时可省。
