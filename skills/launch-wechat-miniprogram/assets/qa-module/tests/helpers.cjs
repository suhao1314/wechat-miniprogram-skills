"use strict";
const { createQaService } = require("../src/qa-service.cjs");
const { createMemoryRepository } = require("../src/memory-repository.cjs");

function createHost(moderation) {
  let current = { id: "anonymous", role: "member" };
  let number = 0;
  const repository = createMemoryRepository();
  return {
    as(id, role = "member") { current = { id, role }; return this; },
    service() { return createQaService({ identity: { current: () => current }, repository, moderation, clock: () => "2026-11-22T00:00:00.000Z", ids: { question: () => `q${++number}`, answer: () => `a${++number}` } }); }
  };
}
async function rejects(promise, code) { await require("node:assert/strict").rejects(promise, new RegExp(code)); }
module.exports = { createHost, rejects };
