"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { routeRequest } = require("../miniapp/cloudfunction/request-router.cjs");

test("router passes a question id string and drops forged identity fields", async () => {
  const calls = [];
  const service = {
    getQuestion: async id => { calls.push(["getQuestion", id]); return { id }; },
    createQuestion: async input => { calls.push(["createQuestion", input]); return input; }
  };
  const loaded = await routeRequest(service, { action: "getQuestion", input: { questionId: "q7", authorId: "attacker" } });
  assert.deepEqual(loaded, { id: "q7" });
  await routeRequest(service, { action: "createQuestion", input: { title: "可以直接运行吗？", body: "我想知道如何导入。", authorId: "attacker", role: "admin", status: "published" } });
  assert.deepEqual(calls, [
    ["getQuestion", "q7"],
    ["createQuestion", { title: "可以直接运行吗？", body: "我想知道如何导入。" }]
  ]);
});
