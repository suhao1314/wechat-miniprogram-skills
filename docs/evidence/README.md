# Pixel-difference evidence

These files show a controlled regression in a fictional campus astronomy reservation banner. The screenshots use synthetic content and a fixed 960 × 540 CSS-pixel viewport at device scale factor 1. The baseline and actual use the same HTML and browser rendering; the actual state adds `transform: translateX(8px)` to the **立即预约** button. There is no real campus or user data, and this is not a WeChat DevTools or physical-device capture.

## Results

`report.json` was produced by the repository's `skills/launch-wechat-miniprogram/tools/visual-regression/compare-images.mjs`. Pixelmatch compared all 518,400 pixels with threshold 0, anti-alias inclusion disabled, and zero allowed differences. It found 1,069 differing pixels (ratio 0.0020621142, about 0.2062%), so status is `regression`. The exact count depends on the browser build and font rasterization; the deliberate 8 CSS-pixel shift should remain plainly detectable. `metrics.js` exposes the observed values as `window.visualMetrics` for a static page to read.

## Reproduce

Requires Windows, Microsoft Edge, Node.js, and the repository's locked comparator dependencies. From the repository root:

```powershell
npm ci --ignore-scripts --prefix skills/launch-wechat-miniprogram/tools/visual-regression
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$fixture = (Resolve-Path docs/evidence/fixture.html).Path
$baseline = Join-Path $env:TEMP 'night-sky-baseline.png'
$actual = Join-Path $env:TEMP 'night-sky-actual.png'
& $edge --headless=new --disable-gpu --no-first-run --window-size=960,540 "--screenshot=$baseline" "file:///$($fixture.Replace('\','/'))"
$html = Get-Content $fixture -Raw
$html = $html.Replace('<body>', '<body class="actual">')
$actualHtml = Join-Path $env:TEMP 'night-sky-actual.html'
Set-Content $actualHtml $html -Encoding utf8
& $edge --headless=new --disable-gpu --no-first-run --window-size=960,540 "--screenshot=$actual" "file:///$($actualHtml.Replace('\','/'))"
node skills/launch-wechat-miniprogram/tools/visual-regression/compare-images.mjs --baseline $baseline --actual $actual --diff $env:TEMP/night-sky-difference.png --report $env:TEMP/night-sky-report.json --threshold 0 --max-diff-pixels 0 --max-diff-ratio 0
```

The command exits with status 1 because the injected shift is intentionally a regression. On Edge versions that block local file capture, serve this fixture locally and use the same fixed viewport instead. Keep output paths distinct; the comparator refuses to overwrite existing difference/report files.
