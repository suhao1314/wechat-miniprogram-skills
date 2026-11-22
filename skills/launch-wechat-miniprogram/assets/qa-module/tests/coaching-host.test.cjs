"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHost, rejects } = require("./helpers.cjs");

const moderation = {
  initialStatus: () => "published", statusAfterAuthorEdit: () => "published",
  canAnswer: (q, a) => q.status === "published" && ["mentor", "admin"].includes(a.role), answerStatus: () => "published",
  canReview: a => a.role === "admin", canRead: q => q.status === "published", canReadAnswer: () => true
};

test("coaching host publishes directly but only mentors can answer", async () => {
  const host = createHost(moderation);
  const question = await host.as("learner-1").service().createQuestion({ title: "怎样准备项目复盘？", body: "我想要一个五分钟复盘框架。" });
  assert.equal(question.status, "published");
  await rejects(host.as("learner-2").service().answer({ questionId: question.id, body: "我也不知道。" }), "FORBIDDEN_ANSWER");
  await host.as("mentor-1", "mentor").service().answer({ questionId: question.id, body: "先写目标、证据和下一次实验。" });
  const visible = await host.as("learner-2").service().getQuestion(question.id);
  assert.equal(visible.answers[0].body, "先写目标、证据和下一次实验。");
  const separateHost = createHost(moderation);
  await rejects(separateHost.as("learner-2").service().getQuestion(question.id), "QUESTION_NOT_FOUND");
});
