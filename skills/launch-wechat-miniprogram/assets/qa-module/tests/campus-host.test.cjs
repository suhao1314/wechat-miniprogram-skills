"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHost, rejects } = require("./helpers.cjs");

const moderation = {
  initialStatus: () => "pending", statusAfterAuthorEdit: () => "pending",
  canAnswer: (q, a) => q.status === "published" && a.role === "admin", answerStatus: () => "published",
  canReview: a => a.role === "admin", canRead: (q, a) => q.status === "published" || q.authorId === a.id || a.role === "admin",
  canReadAnswer: (_, q, a) => q.status === "published" || q.authorId === a.id || a.role === "admin"
};

test("campus host keeps pending questions private and prevents cross-user edits", async () => {
  const host = createHost(moderation);
  const alice = host.as("student-a").service();
  const question = await alice.createQuestion({ title: "图书馆晚上几点关门？", body: "北区图书馆周末开放到几点？" });
  assert.equal(question.status, "pending");
  assert.equal("authorId" in question, false);
  assert.equal("role" in question, false);
  await rejects(host.as("student-b").service().getQuestion(question.id), "FORBIDDEN_READ");
  await rejects(host.as("student-b").service().answer({ questionId: question.id, body: "试图通过回答读取待审内容。" }), "FORBIDDEN_ANSWER");
  await rejects(host.as("student-b").service().editQuestion({ questionId: question.id, title: "替换标题内容", body: "替换内容" }), "FORBIDDEN_EDIT_OTHER_USER");
  const admin = host.as("moderator", "admin").service();
  await admin.review({ questionId: question.id, status: "published" });
  const answer = await admin.answer({ questionId: question.id, body: "周末到 22:00。" });
  assert.equal(answer.body, "周末到 22:00。");
  assert.equal("authorId" in answer, false);
  assert.equal((await host.as("student-b").service().getQuestion(question.id)).answers.length, 1);
});
