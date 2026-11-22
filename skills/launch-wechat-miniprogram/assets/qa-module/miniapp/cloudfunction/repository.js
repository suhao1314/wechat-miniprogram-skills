"use strict";

// Deliberately incomplete adapter contract. Each host maps this to its existing
// collections, indexes and security rules. Never expose this adapter to clients.
function createRepository() {
  throw new Error("Implement repository methods for this host before deployment");
}
module.exports = { createRepository };
