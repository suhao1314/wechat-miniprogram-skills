"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");

const pageModule = path.resolve(__dirname, "../pages/signup/index.js");
const serviceModule = path.resolve(__dirname, "../services/signup-service.js");

function bootPage(store) {
  let definition;
  global.wx = {
    getStorageSync(key) { return store.get(key); },
    setStorageSync(key, value) { store.set(key, value); },
    removeStorageSync(key) { store.delete(key); },
    navigateTo() {},
  };
  global.Page = (page) => { definition = page; };
  delete require.cache[pageModule];
  delete require.cache[serviceModule];
  require(pageModule);
  const instance = {
    data: { activeUser: "lin", activeUserName: "林同学", note: "", status: "", statusTone: "", bookingCount: 0, submitted: false },
    setData(next) { Object.assign(this.data, next); }
  };
  for (const [name, value] of Object.entries(definition)) {
    if (typeof value === "function") instance[name] = value.bind(instance);
  }
  instance.onLoad();
  return instance;
}

test("页面输入自动保存，重建后只恢复原身份草稿", () => {
  const store = new Map();
  const first = bootPage(store);
  first.updateNote({ detail: { value: "半填内容" } });
  const rebuilt = bootPage(store);
  assert.equal(rebuilt.data.note, "半填内容");
  rebuilt.chooseUser({ currentTarget: { dataset: { user: "qiao" } } });
  assert.equal(rebuilt.data.note, "");
  rebuilt.chooseUser({ currentTarget: { dataset: { user: "lin" } } });
  assert.equal(rebuilt.data.note, "半填内容");
});

test("成功只清除当前身份草稿，失败保留输入", () => {
  const store = new Map();
  const page = bootPage(store);
  page.updateNote({ detail: { value: "林的备注" } });
  page.chooseUser({ currentTarget: { dataset: { user: "qiao" } } });
  page.updateNote({ detail: { value: "乔的备注" } });
  page.simulateFailure();
  page.submit();
  assert.equal(page.data.note, "乔的备注");
  assert.match(page.data.status, /网络异常/);
  page.submit();
  assert.equal(page.data.note, "");
  page.chooseUser({ currentTarget: { dataset: { user: "lin" } } });
  assert.equal(page.data.note, "林的备注");
});

test("逐字输入和重新进入都保留空格与换行", () => {
  const store = new Map();
  const first = bootPage(store);
  const note = "  带望远镜  \n第二行 ";
  first.updateNote({ detail: { value: note } });
  assert.equal(first.data.note, note);
  assert.equal(bootPage(store).data.note, note);
});
