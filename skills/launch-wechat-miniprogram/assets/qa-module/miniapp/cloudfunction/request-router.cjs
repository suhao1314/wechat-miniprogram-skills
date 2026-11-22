"use strict";

/**
 * 云函数事件白名单。每个动作只接收它需要的字段，拒绝客户端伪造身份、
 * 角色、审核人和审核状态。此文件可在 Node 中独立测试。
 */
function routeRequest(service, event) {
  const input = event && event.input && typeof event.input === "object" ? event.input : {};
  switch (event && event.action) {
    case "createQuestion":
      return service.createQuestion({ title: input.title, body: input.body });
    case "editQuestion":
      return service.editQuestion({ questionId: input.questionId, title: input.title, body: input.body });
    case "answer":
      return service.answer({ questionId: input.questionId, body: input.body });
    case "getQuestion":
      return service.getQuestion(input.questionId);
    default:
      throw new Error("INVALID_ACTION");
  }
}

module.exports = { routeRequest };
