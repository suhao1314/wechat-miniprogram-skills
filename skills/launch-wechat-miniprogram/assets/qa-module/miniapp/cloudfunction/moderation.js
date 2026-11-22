"use strict";

// Replace only after product owner confirms the host's content policy.
const moderation = {
  initialStatus: () => "pending",
  statusAfterAuthorEdit: () => "pending",
  canAnswer: (question, actor) => question.status === "published" && ["mentor", "admin"].includes(actor.role),
  answerStatus: () => "published",
  canReview: actor => actor.role === "admin",
  canRead: (question, actor) => question.status === "published" || question.authorId === actor.id || actor.role === "admin",
  canReadAnswer: (_, question, actor) => question.status === "published" || question.authorId === actor.id || actor.role === "admin"
};
module.exports = { moderation };
