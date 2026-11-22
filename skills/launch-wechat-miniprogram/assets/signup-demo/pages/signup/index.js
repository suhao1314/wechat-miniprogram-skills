const { createSignupService } = require("../../services/signup-service");

const userNames = { lin: "林同学", qiao: "乔同学" };
const storage = {
  get(key) { try { return wx.getStorageSync(key) || null; } catch (error) { return null; } },
  set(key, value) { wx.setStorageSync(key, value); },
  remove(key) { wx.removeStorageSync(key); }
};
const signup = createSignupService(storage);

Page({
  data: { activeUser: "lin", activeUserName: "林同学", note: "", status: "", statusTone: "", bookingCount: 0, submitted: false },
  onLoad() { this.refresh(true); },
  onShow() { this.refresh(true); },
  onShareAppMessage() {
    return { title: "校园活动报名", path: "/pages/signup/index" };
  },
  chooseUser(event) {
    const activeUser = event.currentTarget.dataset.user;
    this.setData({ activeUser, activeUserName: userNames[activeUser], status: "", statusTone: "", submitted: false });
    this.refresh(true);
  },
  updateNote(event) {
    const note = signup.saveDraft(this.data.activeUser, event.detail.value);
    this.setData({ note, status: "", statusTone: "" });
  },
  saveDraft() {
    const note = signup.saveDraft(this.data.activeUser, this.data.note);
    this.setData({ note, status: "草稿已只保存在这台设备。", statusTone: "quiet" });
  },
  simulateFailure() {
    signup.armFailure();
    this.setData({ status: "下一次提交会模拟网络异常。", statusTone: "quiet" });
  },
  submit() {
    const result = signup.submit(this.data.activeUser, this.data.note);
    this.setData({ status: result.message, statusTone: result.ok ? "success" : "error", submitted: result.ok });
    if (result.ok && !result.duplicate) this.setData({ note: "" });
    this.refresh(false);
  },
  reset() {
    signup.reset();
    this.setData({ note: "", status: "已清空本地演示数据。", statusTone: "quiet", submitted: false });
    this.refresh(true);
  },
  openUiCases() { wx.navigateTo({ url: "/pages/ui-cases/index" }); },
  refresh(restoreDraft) {
    const next = { bookingCount: signup.count() };
    if (restoreDraft) next.note = signup.loadDraft(this.data.activeUser);
    this.setData(next);
  }
});
