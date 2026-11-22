"use strict";

/** In-memory host repository used by the two integration tests. Replace with server-side storage. */
function createMemoryRepository() {
  const questions = new Map();
  const answers = new Map();
  return {
    async insertQuestion(question) { questions.set(question.id, { ...question }); },
    async replaceQuestion(question) { questions.set(question.id, { ...question }); },
    async getQuestion(id) { const value = questions.get(id); return value && { ...value }; },
    async insertAnswer(answer) { answers.set(answer.id, { ...answer }); },
    async listAnswers(questionId) { return [...answers.values()].filter(item => item.questionId === questionId).map(item => ({ ...item })); }
  };
}

module.exports = { createMemoryRepository };
