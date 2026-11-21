"use strict";
const before = document.getElementById("before");
const after = document.getElementById("after");
const compare = document.getElementById("compare");
const result = document.getElementById("result");
const canvas = document.getElementById("diff");
const download = document.getElementById("download");
let previousUrl;
let version = 0;

// 从 PNG 文件头检查尺寸，先限制内存占用，再让浏览器解码。
async function readPng(file) {
  if (file.size > 12 * 1024 * 1024) throw Error("文件超过 12 MB，请裁切到同一页面区域。");
  const header = new DataView(await file.slice(0, 24).arrayBuffer());
  if (header.byteLength < 24 || header.getUint32(0) !== 0x89504e47 ||
      header.getUint32(4) !== 0x0d0a1a0a || header.getUint32(12) !== 0x49484452) {
    throw Error("请选择有效的 PNG 截图。");
  }
  const width = header.getUint32(16);
  const height = header.getUint32(20);
  if (!width || !height || width * height > 8000000) throw Error("图片尺寸超限，请裁切后重试。");
  return {file, width, height};
}

// 临时画布只用来读取像素，解码后的位图及时释放。
async function pixels(source) {
  const bitmap = await createImageBitmap(source.file);
  try {
    const buffer = document.createElement("canvas");
    buffer.width = bitmap.width;
    buffer.height = bitmap.height;
    const context = buffer.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, buffer.width, buffer.height).data;
  } finally {
    bitmap.close();
  }
}

function updateSelection() {
  version++;
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  previousUrl = null;
  canvas.hidden = download.hidden = true;
  download.removeAttribute("href");
  compare.disabled = !(before.files[0] && after.files[0]);
  result.textContent = compare.disabled ? "等待选择两张截图。" : "两张截图已选好。";
}
before.addEventListener("change", updateSelection);
after.addEventListener("change", updateSelection);

// 文件更换后，前一次异步运算的结果不能覆盖当前选择。
compare.addEventListener("click", async () => {
  const run = version;
  compare.disabled = true;
  result.textContent = "正在计算像素差异…";
  try {
    const [a, b] = await Promise.all([readPng(before.files[0]), readPng(after.files[0])]);
    if (a.width !== b.width || a.height !== b.height) {
      throw Error("截图尺寸不同（" + a.width + "×" + a.height + " 和 " + b.width + "×" + b.height + "），请重新截图。");
    }
    const [left, right] = await Promise.all([pixels(a), pixels(b)]);
    if (version !== run) return;
    canvas.width = a.width;
    canvas.height = a.height;
    const context = canvas.getContext("2d");
    const diff = context.createImageData(a.width, a.height);
    const count = window.pixelmatch(left, right, diff.data, a.width, a.height, {threshold: 0, includeAA: false});
    context.putImageData(diff, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (version !== run) return;
    canvas.hidden = false;
    result.textContent = "变化 " + count.toLocaleString("zh-CN") + " 像素，占 " + (100 * count / (a.width * a.height)).toFixed(3) + "%。";
    if (blob) {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      previousUrl = download.href = URL.createObjectURL(blob);
      download.hidden = false;
    }
  } catch (error) {
    if (version === run) result.textContent = "无法对比。" + (error.name === "Error" ? error.message : "请确认两张文件可以作为 PNG 正常打开。");
  } finally {
    if (version === run) compare.disabled = false;
  }
});
