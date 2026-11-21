"use strict";

const storageKey = "night-flight-booking-demo-v1";
const names = { lin: "林同学", qiao: "乔同学" };
const byId = (id) => document.getElementById(id);
const accountButtons = document.querySelectorAll("[data-role]");
const note = byId("booking-note");
const status = byId("booking-status");
const submit = byId("submit-booking");
const log = byId("event-log");
const offlineToggle = byId("arm-offline");
const raceButton = byId("race-booking");

function newState() {
  return {
    active: "lin",
    owner: null,
    drafts: { lin: "", qiao: "" }
  };
}

function loadState() {
  const clean = newState();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return clean;
    clean.active = saved.active === "qiao" ? "qiao" : "lin";
    clean.owner = ["lin", "qiao"].includes(saved.owner) ? saved.owner : null;
    for (const role of Object.keys(names)) {
      if (typeof saved.drafts?.[role] === "string") {
        clean.drafts[role] = saved.drafts[role].slice(0, 120);
      }
    }
  } catch {
    // The demo can run in memory when browser storage is unavailable.
  }
  return clean;
}

let state = loadState();
let edits = { ...state.drafts };
let offlineArmed = false;
let outcomes = {};

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function addEvent(message, tone = "") {
  const item = document.createElement("li");
  const time = document.createElement("time");
  const detail = document.createElement("span");
  const now = new Date();
  time.dateTime = now.toISOString();
  time.textContent = now.toLocaleTimeString("zh-CN", { hour12: false });
  detail.textContent = message;
  detail.dataset.tone = tone;
  item.append(time, detail);
  log.prepend(item);
  if (log.children.length > 18) log.lastElementChild.remove();
  byId("empty-log").hidden = true;
}

function renderDraft() {
  const saved = state.drafts[state.active];
  const unsaved = edits[state.active] !== saved;
  byId("draft-state").textContent = unsaved ? "有未保存改动" : saved ? "本机草稿" : "仅保存在本机";
}

function render() {
  const activeOutcome = outcomes[state.active];
  const ownsSeat = state.owner === state.active;
  const soldOut = Boolean(state.owner);
  for (const button of accountButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.role === state.active));
  }
  offlineToggle.setAttribute("aria-pressed", String(offlineArmed));
  offlineToggle.disabled = soldOut;
  raceButton.disabled = soldOut;
  byId("network-toggle-label").textContent = offlineArmed ? "已设定下次提交断网" : "下次提交模拟断网";
  byId("seats-count").textContent = soldOut ? "0" : "1";
  byId("phone-capacity").textContent = soldOut ? "已满" : "余 1 席";
  byId("seat-owner").textContent = state.owner ? names[state.owner] : "暂无";
  byId("active-account").textContent = names[state.active];
  submit.disabled = soldOut;
  submit.textContent = ownsSeat ? "预约成功" : soldOut ? "席位已满" : activeOutcome?.retry ? "重试预约" : "预约最后一席";
  if (soldOut && !ownsSeat) {
    status.textContent = "最后一席已被另一个账号预约。";
    status.dataset.tone = "fail";
  } else {
    status.textContent = activeOutcome?.message ?? (ownsSeat ? "你的预约已保留。刷新后仍可查看。" : "");
    status.dataset.tone = activeOutcome?.tone ?? (ownsSeat ? "pass" : "");
  }
  note.value = edits[state.active];
  renderDraft();
}

function tryBooking(role) {
  const name = names[role];
  if (offlineArmed) {
    offlineArmed = false;
    outcomes[role] = {
      message: "模拟断网，未占用席位。备注已保留，可以重试。",
      tone: "fail",
      retry: true
    };
    addEvent(name + "提交失败，模拟断网。", "fail");
    return;
  }
  if (state.owner) {
    if (state.owner === role) return;
    outcomes[role] = { message: "最后一席已被另一个账号预约。", tone: "fail" };
    addEvent(name + "未抢到最后一席，余位仍为 0。", "fail");
    return;
  }
  state.owner = role;
  const saved = persist();
  outcomes[role] = {
    message: saved ? "预约成功，最后一席已为你保留。" : "预约成功，仅在此页面保留。浏览器拒绝了本机存储。",
    tone: "pass"
  };
  addEvent(name + "预约成功，余位降为 0。", "pass");
}

for (const button of accountButtons) {
  button.addEventListener("click", () => {
    const role = button.dataset.role;
    if (state.active === role) return;
    state.active = role;
    persist();
    addEvent("切换至" + names[role] + (state.drafts[role] ? "，载入该账号的草稿。" : "。"));
    render();
  });
}

note.addEventListener("input", () => {
  edits[state.active] = note.value;
  renderDraft();
});

byId("save-draft").addEventListener("click", () => {
  state.drafts[state.active] = edits[state.active];
  const saved = persist();
  renderDraft();
  if (!saved) byId("draft-state").textContent = "仅在此页面保留";
  addEvent(names[state.active] + (saved ? (state.drafts[state.active] ? "保存了本机草稿。" : "清空了本机草稿。") : "无法写入本机存储，备注仅在此页面保留。"), saved ? "pass" : "fail");
});

offlineToggle.addEventListener("click", () => {
  offlineArmed = !offlineArmed;
  addEvent(offlineArmed ? "已准备一次模拟断网。" : "取消模拟断网。");
  render();
});

byId("booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.owner) return;
  tryBooking(state.active);
  render();
});

raceButton.addEventListener("click", () => {
  if (state.owner) return;
  const other = state.active === "lin" ? "qiao" : "lin";
  addEvent("两个账号同时提交，模拟按到达顺序处理。");
  tryBooking(state.active);
  tryBooking(other);
  render();
});

byId("reset-demo").addEventListener("click", () => {
  state = newState();
  edits = { ...state.drafts };
  offlineArmed = false;
  outcomes = {};
  const saved = persist();
  log.replaceChildren();
  byId("empty-log").hidden = false;
  if (!saved) addEvent("本页已重置，浏览器拒绝写入本机存储。", "fail");
  render();
});

const evidenceButtons = document.querySelectorAll("[data-evidence]");
const evidenceImages = document.querySelectorAll("[data-image]");
for (const button of evidenceButtons) {
  button.addEventListener("click", () => {
    const selection = button.dataset.evidence;
    for (const option of evidenceButtons) {
      option.setAttribute("aria-pressed", String(option === button));
    }
    for (const figure of evidenceImages) {
      figure.hidden = selection !== "all" && figure.dataset.image !== selection;
    }
    byId("evidence-grid").classList.toggle("is-single", selection !== "all");
  });
}

const metrics = window.visualMetrics;
if (metrics && Number.isInteger(metrics.diffPixels) && Number.isFinite(metrics.diffRatio)) {
  const pixels = metrics.diffPixels.toLocaleString("zh-CN");
  const percent = metrics.diffRatio.toLocaleString("zh-CN", { style: "percent", maximumFractionDigits: 3 });
  byId("evidence-summary").textContent = "差异 " + pixels + " 像素，占截图 " + percent + "。";
} else {
  byId("evidence-summary").textContent = "像素统计暂不可用。";
}

render();
if (state.drafts[state.active]) addEvent("页面打开，已恢复" + names[state.active] + "的本机草稿。", "pass");
