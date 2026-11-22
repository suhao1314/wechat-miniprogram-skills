"use strict";
const { randomUUID } = require("node:crypto");

/**
 * Q&A business rules. The host owns identity, persistence and moderation policy.
 * Client input must never supply authorId, role or a review status.
 */
function createQaService({ identity, repository, moderation, clock = () => new Date().toISOString(), ids = defaultIds }) {
  required(identity, "identity");
  required(repository, "repository");
  required(moderation, "moderation");

  function actor() {
    const current = identity.current();
    if (!current || typeof current.id !== "string" || !current.id) throw new Error("UNAUTHENTICATED");
    return { id: current.id, role: current.role || "member" };
  }

  /** 创建问题时只接受页面填写的标题和正文，身份与状态均由服务端生成。 */
  async function createQuestion(input) {
    const current = actor();
    const title = text(input && input.title, "标题", 8, 80);
    const body = text(input && input.body, "问题说明", 1, 1000);
    const question = {
      id: ids.question(), title, body, authorId: current.id,
      status: moderation.initialStatus(current), createdAt: clock(), updatedAt: clock()
    };
    await repository.insertQuestion(question);
    return publicQuestion(question, current, moderation);
  }

  /** 编辑只能由原提问者执行，编辑后是否重新待审由宿主策略决定。 */
  async function editQuestion(input) {
    const current = actor();
    const question = await requiredQuestion(repository, input && input.questionId);
    if (question.authorId !== current.id) throw new Error("FORBIDDEN_EDIT_OTHER_USER");
    if (question.status === "removed") throw new Error("QUESTION_UNAVAILABLE");
    const updated = {
      ...question,
      title: text(input.title, "标题", 8, 80),
      body: text(input.body, "问题说明", 1, 1000),
      status: moderation.statusAfterAuthorEdit(question, current),
      updatedAt: clock()
    };
    await repository.replaceQuestion(updated);
    return publicQuestion(updated, current, moderation);
  }

  /** 回答前同时检查可见性与回答资格，避免待审问题被回答接口间接暴露。 */
  async function answer(input) {
    const current = actor();
    const question = await requiredQuestion(repository, input && input.questionId);
    if (!moderation.canRead(question, current)) throw new Error("FORBIDDEN_ANSWER");
    if (!moderation.canAnswer(question, current)) throw new Error("FORBIDDEN_ANSWER");
    if (question.status === "removed") throw new Error("QUESTION_UNAVAILABLE");
    const answer = { id: ids.answer(), questionId: question.id, body: text(input.body, "回答", 1, 2000), authorId: current.id, status: moderation.answerStatus(current), createdAt: clock() };
    await repository.insertAnswer(answer);
    return publicAnswer(answer, current, moderation);
  }

  /** 审核状态由被信任的管理员角色决定，前端不能指定审核人。 */
  async function review(input) {
    const current = actor();
    if (!moderation.canReview(current)) throw new Error("FORBIDDEN_REVIEW");
    const question = await requiredQuestion(repository, input && input.questionId);
    const status = input && input.status;
    if (!["published", "removed"].includes(status)) throw new Error("INVALID_REVIEW_STATUS");
    const updated = { ...question, status, reviewedBy: current.id, updatedAt: clock() };
    await repository.replaceQuestion(updated);
    return publicQuestion(updated, current, moderation);
  }

  /** 读取时按当前身份过滤问题与回答，并只返回页面所需的公开字段。 */
  async function getQuestion(questionId) {
    const current = actor();
    const question = await requiredQuestion(repository, questionId);
    if (!moderation.canRead(question, current)) throw new Error("FORBIDDEN_READ");
    const answers = await repository.listAnswers(question.id);
    return { ...publicQuestion(question, current, moderation), answers: answers.filter(answer => moderation.canReadAnswer(answer, question, current)).map(answer => publicAnswer(answer, current, moderation)) };
  }

  return { createQuestion, editQuestion, answer, review, getQuestion };
}

function publicQuestion(question, current, moderation) {
  return { id: question.id, title: question.title, body: question.body, status: question.status, createdAt: question.createdAt, updatedAt: question.updatedAt, editable: question.authorId === current.id && question.status !== "removed", reviewable: moderation.canReview(current) };
}
function publicAnswer(answer) { return { id: answer.id, questionId: answer.questionId, body: answer.body, createdAt: answer.createdAt }; }
function text(value, label, min, max) {
  if (typeof value !== "string") throw new Error(`INVALID_${label}`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new Error(`INVALID_${label}`);
  return trimmed;
}
async function requiredQuestion(repository, id) {
  if (typeof id !== "string" || !id) throw new Error("INVALID_QUESTION_ID");
  const question = await repository.getQuestion(id);
  if (!question) throw new Error("QUESTION_NOT_FOUND");
  return question;
}
function required(value, name) { if (!value) throw new Error(`MISSING_${name.toUpperCase()}`); }
const defaultIds = {
  question: () => `q_${randomUUID()}`,
  answer: () => `a_${randomUUID()}`
};

module.exports = { createQaService };
