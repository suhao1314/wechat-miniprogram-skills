"use strict";

// Example server entry. Deploy this in a cloud function and replace repository
// methods with database operations guarded by the server-side identity below.
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { createQaService } = require("../../src/qa-service.cjs");
const { createRepository } = require("./repository");
const { moderation } = require("./moderation");
const { routeRequest } = require("./request-router.cjs");

exports.main = async (event) => {
  const context = cloud.getWXContext();
  const service = createQaService({
    identity: { current: () => ({ id: context.OPENID, role: "member" }) },
    repository: createRepository(cloud.database()),
    moderation
  });
  return routeRequest(service, event);
};
