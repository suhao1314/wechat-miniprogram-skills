#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import jpeg from 'jpeg-js';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';

const EXIT = {PASS: 0, REGRESSION: 1, INPUT: 2, DIMENSIONS: 3};

function usage(message) {
  if (message) console.error(`Error: ${message}`);
  console.error(`Usage: node compare-images.mjs --baseline <image> --actual <image> --diff <diff.png> --report <report.json> [options]

Options:
  --threshold <0..1>          Per-pixel perceptual threshold. Default: 0.1
  --max-diff-pixels <count>   Allowed differing pixels. Default: 0
  --max-diff-ratio <0..1>     Allowed differing-pixel ratio. Default: 0
  --mask <mask.png>           White or non-transparent pixels are ignored.
  --include-aa                Count anti-aliased pixels as differences.
  --help                      Show this help.`);
  process.exit(EXIT.INPUT);
}

function parseArgs(argv) {
  const values = {};
  const booleanFlags = new Set(['include-aa', 'help']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) usage(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (booleanFlags.has(key)) {
      values[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) usage(`Missing value for --${key}`);
    values[key] = value;
    index += 1;
  }
  if (values.help) usage();
  for (const required of ['baseline', 'actual', 'diff', 'report']) {
    if (!values[required]) usage(`Missing --${required}`);
  }
  return values;
}

function numberOption(value, name, fallback, min, max) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    usage(`--${name} must be a number from ${min} to ${max}`);
  }
  return parsed;
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), {recursive: true});
}

function writeReport(reportPath, report) {
  ensureParent(reportPath);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function validateOutputPaths(args) {
  const inputs = [args.baseline, args.actual, args.mask].filter(Boolean).map((filePath) => path.resolve(filePath));
  const outputs = [args.diff, args.report].map((filePath) => path.resolve(filePath));
  if (outputs[0] === outputs[1]) usage('--diff and --report must name different files');
  for (const output of outputs) {
    if (inputs.includes(output)) usage(`Output path aliases an input: ${output}`);
    if (fs.existsSync(output)) usage(`Refusing to overwrite existing output: ${output}`);
  }
}

function readImage(filePath) {
  const image = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.png') return PNG.sync.read(image);
  if (extension === '.jpg' || extension === '.jpeg') {
    const decoded = jpeg.decode(image, {useTArray: true, formatAsRGBA: true});
    if (!decoded || !decoded.data) throw new Error(`Unable to decode JPEG: ${filePath}`);
    return decoded;
  }
  throw new Error(`Unsupported image format for ${filePath}. Use PNG, JPG, or JPEG.`);
}

function maskFromImage(mask, width, height) {
  if (mask.width !== width || mask.height !== height) {
    const error = new Error('Mask dimensions do not match compared images.');
    error.code = 'DIMENSIONS';
    throw error;
  }
  const bytes = new Uint8Array(width * height);
  for (let pixel = 0; pixel < bytes.length; pixel += 1) {
    const offset = pixel * 4;
    bytes[pixel] = mask.data[offset + 3] > 0 && (mask.data[offset] > 0 || mask.data[offset + 1] > 0 || mask.data[offset + 2] > 0) ? 1 : 0;
  }
  return bytes;
}

function countMasked(mask) {
  return mask ? mask.reduce((total, value) => total + (value ? 1 : 0), 0) : 0;
}

function normaliseMaskedPixels(baseline, actual, ignoreMask) {
  if (!ignoreMask) return {baseline: baseline.data, actual: actual.data};
  const baselineData = Buffer.from(baseline.data);
  const actualData = Buffer.from(actual.data);
  for (let pixel = 0; pixel < ignoreMask.length; pixel += 1) {
    if (!ignoreMask[pixel]) continue;
    const offset = pixel * 4;
    actualData[offset] = baselineData[offset];
    actualData[offset + 1] = baselineData[offset + 1];
    actualData[offset + 2] = baselineData[offset + 2];
    actualData[offset + 3] = baselineData[offset + 3];
  }
  return {baseline: baselineData, actual: actualData};
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  validateOutputPaths(args);
  const threshold = numberOption(args.threshold, 'threshold', 0.1, 0, 1);
  const maxDiffPixels = numberOption(args['max-diff-pixels'], 'max-diff-pixels', 0, 0, Number.MAX_SAFE_INTEGER);
  const maxDiffRatio = numberOption(args['max-diff-ratio'], 'max-diff-ratio', 0, 0, 1);
  let baseline;
  let actual;
  let ignoreMask;
  try {
    baseline = readImage(args.baseline);
    actual = readImage(args.actual);
    if (baseline.width !== actual.width || baseline.height !== actual.height) {
      const report = {status: 'environment-mismatch', reason: 'dimensions-differ', baseline: {width: baseline.width, height: baseline.height}, actual: {width: actual.width, height: actual.height}};
      writeReport(args.report, report);
      console.error('Images have different dimensions. Re-capture under the same viewport and device configuration.');
      process.exit(EXIT.DIMENSIONS);
    }
    if (args.mask) ignoreMask = maskFromImage(readImage(args.mask), baseline.width, baseline.height);
  } catch (error) {
    if (error.code === 'DIMENSIONS') {
      writeReport(args.report, {status: 'environment-mismatch', reason: 'mask-dimensions-differ'});
      console.error(error.message);
      process.exit(EXIT.DIMENSIONS);
    }
    console.error(error.message);
    process.exit(EXIT.INPUT);
  }

  const diff = new PNG({width: baseline.width, height: baseline.height});
  const maskedPixels = countMasked(ignoreMask);
  const comparedPixels = baseline.width * baseline.height - maskedPixels;
  if (comparedPixels === 0) {
    writeReport(args.report, {status: 'invalid-configuration', reason: 'mask-excludes-every-pixel', dimensions: {width: baseline.width, height: baseline.height}, maskedPixels});
    console.error('Mask excludes every pixel. Narrow the dynamic area before comparing.');
    process.exit(EXIT.INPUT);
  }
  const comparableData = normaliseMaskedPixels(baseline, actual, ignoreMask);
  const diffPixels = pixelmatch(comparableData.baseline, comparableData.actual, diff.data, baseline.width, baseline.height, {
    threshold,
    includeAA: Boolean(args['include-aa']),
    diffMask: true
  });
  const diffRatio = comparedPixels === 0 ? 0 : diffPixels / comparedPixels;
  const passed = diffPixels <= maxDiffPixels && diffRatio <= maxDiffRatio;
  ensureParent(args.diff);
  fs.writeFileSync(args.diff, PNG.sync.write(diff));
  const report = {
    status: passed ? 'pass' : 'regression',
    baseline: path.resolve(args.baseline),
    actual: path.resolve(args.actual),
    diff: path.resolve(args.diff),
    dimensions: {width: baseline.width, height: baseline.height},
    threshold,
    includeAntiAlias: Boolean(args['include-aa']),
    maskedPixels,
    comparedPixels,
    diffPixels,
    diffRatio,
    allowed: {maxDiffPixels, maxDiffRatio}
  };
  writeReport(args.report, report);
  console.log(JSON.stringify(report));
  process.exit(passed ? EXIT.PASS : EXIT.REGRESSION);
}

main();
