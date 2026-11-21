# 页面截图与视觉回归

页面、主题或公共组件有视觉改动时，列出受影响的路由、角色与状态。从开发验收开始执行，进入体验版前复查尚未解决的差异。

1. 小程序通过同级 wechat-page-qa 的 probe-page.ps1 取得开发者工具内部截图；有历史同环境基准时使用 scripts/compare-wechat-page.ps1 串联截图和像素比较。Web 管理端从浏览器截图入口获取页面图，使用本技能 tools/visual-regression 内的同一比较工具。两端独立建基准。缺少模拟器或登录时记录阻塞，可先用已有成对截图检查比较工具。
2. 固定设备、视口、像素密度、字体、主题、滚动位置、数据和页面状态。等待目标元素、字体、图片和动画稳定。对可固定的时间和轮播先固定；确实不可固定的区域才记录遮罩，避开待验区域。优先使用来源实际支持的无损 PNG。微信现有 probe 输出 JPG，基准和新图应使用一致编码；不要通过改扩展名声称无损。
3. 首次出现的页面生成候选基准，人工或已有授权的设计验收确认后留作具名版本。持久基准放项目测试资源，临时截图、差异图和报告归工作区临时验收目录。使用合成数据或脱敏账号。
4. 用 Pixelmatch 输出旧图、新图所在位置、差异图、变化像素和占有效面积比例。同尺寸才比较，尺寸不同先核对设备与缩放；记录像素颜色容差、页面变更容忍比例和遮罩。检查失败与发现视觉差异分别报告。
5. 阅读两张原图、差异图及相关组件，必要时点击验证文字截断、点击区域和状态切换。零像素变化也需要完成约定的交互和权限测试。预期变更确认后另存新版基准；异常则修复、重新截图、重新比较。比较程序不得自动覆盖旧基准。

## 执行入口

已确认该项目页面验收、已准备稳定的选择器和经认可的基准后，从本技能根目录执行。参数中的目录和页面值由项目上下文提供。

```powershell
$result = & ./scripts/compare-wechat-page.ps1 -ClientName Codex -ProjectPath $projectPath -Page $pageRoute -Selector $readySelector -BaselinePath $baselinePath -OutputDirectory $qaDirectory -Approved
$result | Select-Object route, current, difference, report, passed
```

只比较已捕获的浏览器或小程序截图时，从[像素对比工具使用说明](../tools/visual-regression/README.md)运行 Node 命令。工具复制到新电脑后如缺少依赖，在工具目录执行 npm ci。首次建立基准时先运行 wechat-page-qa 的 probe-page.ps1，查看产出的候选图并记录所用设备和数据状态。
