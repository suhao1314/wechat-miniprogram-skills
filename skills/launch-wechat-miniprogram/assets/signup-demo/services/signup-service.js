"use strict";

const DRAFT_PREFIX = "signup-demo-draft:";
const BOOKING_KEY = "signup-demo-bookings";

function createMemoryStorage() {
  const entries = new Map();
  return {
    get(key) { return entries.has(key) ? entries.get(key) : null; },
    set(key, value) { entries.set(key, value); },
    remove(key) { entries.delete(key); }
  };
}

function normalizeNote(note) {
  return String(note || "").slice(0, 120);
}

function createSignupService(storage = createMemoryStorage()) {
  let failNextSubmit = false;

  function draftKey(userId) { return DRAFT_PREFIX + userId; }
  function getBookings() { return storage.get(BOOKING_KEY) || {}; }
  function setBookings(bookings) { storage.set(BOOKING_KEY, bookings); }

  return {
    loadDraft(userId) {
      return storage.get(draftKey(userId)) || "";
    },
    saveDraft(userId, note) {
      const value = normalizeNote(note);
      storage.set(draftKey(userId), value);
      return value;
    },
    armFailure() { failNextSubmit = true; },
    submit(userId, note) {
      if (failNextSubmit) {
        failNextSubmit = false;
        return { ok: false, reason: "network", message: "模拟网络异常，报名没有提交。备注已保留，可以重试。" };
      }
      const bookings = getBookings();
      if (bookings[userId]) {
        return { ok: true, duplicate: true, booking: bookings[userId], message: "你已经报名成功，无需重复提交。" };
      }
      const booking = { userId, note: normalizeNote(note), createdAt: "local-demo" };
      bookings[userId] = booking;
      setBookings(bookings);
      storage.remove(draftKey(userId));
      return { ok: true, duplicate: false, booking, message: "报名成功。" };
    },
    count() { return Object.keys(getBookings()).length; },
    reset() {
      storage.remove(BOOKING_KEY);
      storage.remove(draftKey("lin"));
      storage.remove(draftKey("qiao"));
      failNextSubmit = false;
    }
  };
}

module.exports = { createMemoryStorage, createSignupService };
