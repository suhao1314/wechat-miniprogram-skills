# 微信小程序开发与验收 Skills

**最后一个名额，两个人同时点报名。你的第一个小程序，扛得住这一点吗？**

这套 Skill 带新手从一句想法走到微信体验版，也教 AI 专挑那些「看上去已经做好」的地方去试。报名页画好了，还要试半路断网、换号串草稿、重复点提交。按钮改了位置，还能用前后两张截图找出改动落在哪儿。

[**打开「夜航」互动演示**](https://suhao1314.github.io/wechat-miniprogram-skills/) · [用你自己的两张截图找差异](https://suhao1314.github.io/wechat-miniprogram-skills/compare.html) · [查看像素差异原图](docs/evidence/difference.png) · [下载项目](https://github.com/suhao1314/wechat-miniprogram-skills/archive/refs/heads/main.zip)

[![夜航预约验收台，可切换两个演示账号、模拟断网和争抢末席](docs/night-observatory.png)](https://suhao1314.github.io/wechat-miniprogram-skills/)

### 给它一分钟，试着把报名弄坏

| 你来操作 | 看哪里 |
| --- | --- |
| 写句备注，保存草稿，刷新，再切到另一位同学 | 原账号能找回文字，另一个账号看到自己的草稿。 |
| 打开「下次提交模拟断网」，点预约，再重试 | 第一次失败时名额还在，重试后才占位。 |
| 重置，点「两个账号同时提交」 | 看谁拿到最后一席，以及另一个人收到什么反馈。 |
| 打开「截图对比」，来回切换原图和差异图 | 看哪处控件移动了，以及 Pixelmatch 实际数到了多少个变化像素。 |

演示在你的浏览器里用虚构数据运行。微信真机、云端并发和正式提审分别验收。下载仓库后也可以双击 `docs/index.html` 离线体验。

### 把同样的方法带回自己的项目

- **需求说不清也能开工准备。** 比如「我想做活动报名」，可以先让 AI 问清谁能报名、满员后怎么处理、哪些资料值得收。决定会改变页面和成本的事，由你拍板。
- **让 AI 拿设计给你选。** 同样一批自习室，按时段、楼栋、余位排序，分别方便三类同学。用这组样张评审信息顺序，再把方法用到自己的页面。[三种手机页面](docs/ui-preview.png)
- **让验收结论有凭据。** 在支持的开发者工具环境中拍页面，留下基准图、新图和差异图。业务回归再检查实际点击、失败恢复和权限。两类结果都能交给下一个人复核。[视觉回归说明](skills/launch-wechat-miniprogram/references/visual-regression.md) · [业务回归说明](skills/launch-wechat-miniprogram/references/business-regression.md)

## 从这里开始

最省事的方式是把下面提示词复制到支持 Agent Skills 的 AI 编程工具的新对话里。主技能作为入口，可选页面验收技能与它同级安装：

```text
请从 https://github.com/suhao1314/wechat-miniprogram-skills 安装 skills/launch-wechat-miniprogram。
我也需要可选的模拟器截图工具，请将 skills/wechat-page-qa 安装到同一个技能目录。
如已有同名技能，请先核对版本。装好后告诉我如何在新对话里调用。
```

安装后，在新的对话中输入 `$launch-wechat-miniprogram` 启动主技能。不同工具的安装目录和调用方式可能不同，以该工具当前说明为准；技能文件可读不代表 AI 已连接你的本机、微信账号或开发者工具。

## 手动安装

如果你的 AI 工具没有安装器，可以从 GitHub 下载仓库 ZIP：

1. 打开 [仓库页面](https://github.com/suhao1314/wechat-miniprogram-skills)，选择 **Code → Download ZIP**。
2. 解压 ZIP，在 `skills` 目录中找到 `launch-wechat-miniprogram` 文件夹；需要实际页面验收时，再找到同级的 `wechat-page-qa`。
3. 将需要的完整技能文件夹复制到 AI 工具支持的 Skills 目录。目录结构应类似：

   ```text
   <Skills目录>/
   ├── launch-wechat-miniprogram/
   │   └── SKILL.md
   └── wechat-page-qa/       # 可选
       └── SKILL.md
   ```

4. 在新对话中调用 `$launch-wechat-miniprogram`。如果工具不支持 `$技能名`，请告诉它读取安装目录里的 `launch-wechat-miniprogram/SKILL.md`。

已有同名目录时先比较，不要直接覆盖。手动 ZIP 安装需要自己留意后续更新。

## 用法示例

**准备一个新项目：**

```text
$launch-wechat-miniprogram 我想做一个给同学记录拼餐费用的小程序。我是第一次做小程序，请先问清楚关键需求和首版范围，再一步一步带我做；没有确认前不要创建源码，也请把需要我亲自操作的平台步骤说清楚。
```

**评审已有页面：**

```text
$launch-wechat-miniprogram 请评审我发的这张小程序页面截图。直接告诉我最影响使用的问题、你建议怎么改以及理由；结合手机阅读和点击场景判断，不要只给笼统的审美评价。
```

如果是改已有项目，附上目标页面截图、主要用户和当前困扰会更容易得到具体建议。主技能会要求 AI 先了解现有项目，再决定改动范围。

## 测试与可选依赖

主技能仓库包含结构校验脚本和单元测试。修改技能文件后，可在技能目录运行：

```bash
python scripts/validate_skill.py .
python scripts/validate_skill.py . --check-links
python -m unittest discover -s tests -v
```

这些检查用于核对技能文件结构、链接和部分静态行为，不代表生成的小程序已通过开发者工具、真机或线上验收。开发项目时，技能会根据任务选择适用的检查；如需真实页面检查，可选用 `wechat-page-qa`，但需具备相应的微信开发者工具环境，并按技能说明取得授权。

主技能的部分可选工具需要 Node.js/npm 或 Python，具体以相应脚本说明为准。不使用相关能力时，不必安装全部依赖。需要比较两张已拍好的截图时，进入 [像素对比工具](skills/launch-wechat-miniprogram/tools/visual-regression)，运行 `npm ci --ignore-scripts` 和 `npm test`。自动拍摄模拟器页面另需同级的 [wechat-page-qa](skills/wechat-page-qa/SKILL.md)、兼容的 Windows 开发者工具 CLI，以及用户授权。云开发、实名、体验版与提审由使用者在自己的环境操作。

## 参与贡献

欢迎提交建议、问题和改进：

1. Fork 本仓库，在自己的 Fork 中创建分支并提交修改。
2. 提交前运行与改动相关的校验，并在 Pull Request 中说明改了什么、如何检查、还有哪些限制。
3. 遇到缺陷或有改进建议，可先查看现有 [Issues](https://github.com/suhao1314/wechat-miniprogram-skills/issues)，再新建 Issue 描述复现步骤或使用场景。

请勿在 Issue 或提交内容中放入 AppSecret、密钥、真实用户信息或其他敏感资料。提交内容应由贡献者拥有，或明确取得使用授权。

## 致谢与许可

本项目基于 niuhuoshan 的 [launch-wechat-miniprogram](https://github.com/niuhuoshan/launch-wechat-miniprogram) 扩展。本版加入任务驱动的 UI 评审、业务回归场景和模拟器截图对比。页面构思借鉴花叔的 [Huashu Design](https://github.com/alchaincyf/huashu-design)，用微信小程序场景重新编写，使用时无需另外安装。设计方向示例用于启发讨论，不应被误认为微信官方规范或固定模板。

本版新增的原创内容以 **PolyForm Noncommercial 1.0.0** 公开源码，可按条款学习、复刻和分享。使用这些内容接商业外包、做付费产品或服务，请先取得单独商用授权。历史 MIT 版本、上游代码和第三方依赖保留各自授权。[许可范围与商用联系](LICENSING.md) · [许可证全文](LICENSE)
