import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import jpeg from 'jpeg-js';
import {PNG} from 'pngjs';

const toolDir = path.resolve(import.meta.dirname, '..');
const cli = path.join(toolDir, 'compare-images.mjs');

function makeImage(filePath, shifted) {
  const image = new PNG({width: 20, height: 20});
  image.data.fill(255);
  const x = shifted ? 8 : 6;
  for (let row = 6; row < 12; row += 1) {
    for (let column = x; column < x + 6; column += 1) {
      const offset = (row * image.width + column) * 4;
      image.data[offset] = 0;
      image.data[offset + 1] = 100;
      image.data[offset + 2] = 220;
      image.data[offset + 3] = 255;
    }
  }
  fs.writeFileSync(filePath, PNG.sync.write(image));
}

function makeJpeg(filePath, shifted) {
  const pngPath = `${filePath}.png`;
  makeImage(pngPath, shifted);
  const image = PNG.sync.read(fs.readFileSync(pngPath));
  fs.writeFileSync(filePath, jpeg.encode({data: image.data, width: image.width, height: image.height}, 95).data);
}

function compare(directory, actual, extra = []) {
  return spawnSync(process.execPath, [cli, '--baseline', path.join(directory, 'baseline.png'), '--actual', actual, '--diff', path.join(directory, 'diff.png'), '--report', path.join(directory, 'report.json'), ...extra], {encoding: 'utf8'});
}

function makeMask(filePath, full) {
  const image = new PNG({width: 20, height: 20});
  if (full) {
    image.data.fill(255);
  } else {
    for (let row = 5; row < 13; row += 1) {
      for (let column = 5; column < 15; column += 1) {
        const offset = (row * image.width + column) * 4;
        image.data[offset] = 255;
        image.data[offset + 1] = 255;
        image.data[offset + 2] = 255;
        image.data[offset + 3] = 255;
      }
    }
  }
  fs.writeFileSync(filePath, PNG.sync.write(image));
}

test('identical screenshots pass with zero changed pixels', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-regression-'));
  makeImage(path.join(directory, 'baseline.png'), false);
  makeImage(path.join(directory, 'actual.png'), false);
  const result = compare(directory, path.join(directory, 'actual.png'));
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'report.json')));
  assert.equal(report.diffPixels, 0);
});

test('a two-pixel shift produces a diff image and regression exit status', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-regression-'));
  makeImage(path.join(directory, 'baseline.png'), false);
  makeImage(path.join(directory, 'actual.png'), true);
  const result = compare(directory, path.join(directory, 'actual.png'));
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'report.json')));
  assert.ok(report.diffPixels > 0);
  assert.ok(fs.statSync(path.join(directory, 'diff.png')).size > 0);
});

test('JPEG screenshots decode and produce a PNG diff', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-regression-'));
  makeJpeg(path.join(directory, 'baseline.jpg'), false);
  makeJpeg(path.join(directory, 'actual.jpg'), true);
  const result = spawnSync(process.execPath, [cli, '--baseline', path.join(directory, 'baseline.jpg'), '--actual', path.join(directory, 'actual.jpg'), '--diff', path.join(directory, 'diff.png'), '--report', path.join(directory, 'report.json')], {encoding: 'utf8'});
  assert.equal(result.status, 1, result.stderr);
  assert.ok(fs.statSync(path.join(directory, 'diff.png')).size > 0);
});

test('a mask ignores the intentionally dynamic region', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-regression-'));
  makeImage(path.join(directory, 'baseline.png'), false);
  makeImage(path.join(directory, 'actual.png'), true);
  makeMask(path.join(directory, 'mask.png'), false);
  const result = compare(directory, path.join(directory, 'actual.png'), ['--mask', path.join(directory, 'mask.png')]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'report.json')));
  assert.equal(report.diffPixels, 0);
  assert.ok(report.maskedPixels > 0);
});

test('a full mask fails as an invalid comparison configuration', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-regression-'));
  makeImage(path.join(directory, 'baseline.png'), false);
  makeImage(path.join(directory, 'actual.png'), true);
  makeMask(path.join(directory, 'mask.png'), true);
  const result = compare(directory, path.join(directory, 'actual.png'), ['--mask', path.join(directory, 'mask.png')]);
  assert.equal(result.status, 2, result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'report.json')));
  assert.equal(report.reason, 'mask-excludes-every-pixel');
});

test('an output path cannot alias an input screenshot', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-regression-'));
  const baseline = path.join(directory, 'baseline.png');
  const actual = path.join(directory, 'actual.png');
  makeImage(baseline, false);
  makeImage(actual, true);
  const before = fs.readFileSync(actual);
  const result = spawnSync(process.execPath, [cli, '--baseline', baseline, '--actual', actual, '--diff', actual, '--report', path.join(directory, 'report.json')], {encoding: 'utf8'});
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(fs.readFileSync(actual), before);
});
