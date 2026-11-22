"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { createMemoryStorage, createSignupService } = require("../services/signup-service");

test("草稿可恢复且按虚构身份隔离", () => {
  const signup = createSignupService(createMemoryStorage());
  signup.saveDraft("lin", "想用望远镜看木星");
  assert.equal(signup.loadDraft("lin"), "想用望远镜看木星");
  assert.equal(signup.loadDraft("qiao"), "");
});
test("一次失败不产生报名且重试成功", () => {
  const signup = createSignupService(createMemoryStorage());
  signup.armFailure();
  assert.equal(signup.submit("lin", "备注").ok, false);
  assert.equal(signup.count(), 0);
  assert.equal(signup.submit("lin", "备注").ok, true);
  assert.equal(signup.count(), 1);
});
test("同一身份重复报名不增加记录", () => {
  const signup = createSignupService(createMemoryStorage());
  assert.equal(signup.submit("lin", "第一次").duplicate, false);
  const second = signup.submit("lin", "第二次");
  assert.equal(second.duplicate, true);
  assert.equal(signup.count(), 1);
});
