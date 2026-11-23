# Visual regression

`compare-images.mjs` compares screenshots with Pixelmatch and always writes a PNG diff plus a JSON report. It accepts PNG, JPG and JPEG input. Capture matching pages at the same viewport, scale, font setting and stable data state before comparing.

```powershell
cd tools/visual-regression
npm ci
node compare-images.mjs `
  --baseline ../../examples/visual-baselines/home.png `
  --actual ../../tmp/current-home.png `
  --diff ../../tmp/home-diff.png `
  --report ../../tmp/home-report.json `
  --threshold 0.1 `
  --max-diff-pixels 20 `
  --max-diff-ratio 0.001
```

Exit code `0` means the image is within the limits. `1` means a visual regression. `3` means the two screenshots or the optional mask differ in size. Exit code `2` reports an input or decoding error.

Pass `--mask ../../examples/visual-baselines/home-mask.png` to ignore non-transparent, non-black pixels in a PNG mask, such as a clock or animated area. The mask must match the screenshot dimensions and must leave at least one pixel to compare. The tool refuses to overwrite a pre-existing diff or report, and refuses any output path that aliases an input. Do not update a baseline until a human has accepted the intended change.
