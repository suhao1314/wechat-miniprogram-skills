const cases = [
  { key: 'policy', title: '个人中心', question: '想看隐私政策时，要经过几个入口？', note: '在个人中心，低频查阅放在页尾，用两个清晰可点的链接。到了注册确认页，协议入口应靠近确认按钮。' },
  { key: 'form', title: '长表单', question: '漏填一项，用户要重新填多少？', note: '保留已经填写的字段，把错误说明放到出错处。让用户知道该改哪一项，再次提交时只需改这一项。' },
  { key: 'list', title: '列表返回', question: '往下翻过几屏，进详情再返回，会落在哪里？', note: '详情返回时恢复列表位置。订单、资源或帖子列表有筛选条件时，也应保留条件。请先下滑再点开一项。' }
];
const venues = ['东区图书馆', '西区活动室', '北区阅览室', '南区共享空间'];
const rooms = Array.from({ length: 24 }, (_, i) => ({ id: i + 1, title: venues[i % 4] + ' · ' + (i + 1) + ' 号桌' }));

Page({
  data: { cases, current: cases[0], good: true, nickname: '', count: '', feedback: '', error: '', detail: '', policyMenu: false, rooms, scrollTop: 0 },

  // 切换任务或示例时清理当前演示状态，不写入用户的真实资料。
  switchView(event) {
    const { key, mode } = event.currentTarget.dataset;
    const next = cases.find(item => item.key === key) || this.data.current;
    this.lastTop = 0;
    this.setData({ current: next, good: mode ? mode === 'good' : this.data.good,
      nickname: '', count: '', feedback: '', error: '', detail: '', policyMenu: false, scrollTop: 0 });
  },

  // 反例刻意多设一级选择，以便比较抵达指定政策需要的点击数。
  openPolicies() { this.setData({ policyMenu: true }); },
  // 这里只展示演示文案，不作为实际项目的隐私协议。
  openPolicy(event) {
    wx.showModal({ title: event.currentTarget.dataset.title, content: '这是演示查阅路径的示例。', showCancel: false });
  },
  // 将输入分别保存，校验失败时正例保留其他字段。
  typeField(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value, error: '', feedback: '' }); },
  // 用同一组业务条件对照两种错误反馈。
  submitForm() {
    const { nickname, count, good } = this.data;
    const error = !nickname.trim() ? '称呼' : !/^[1-9]\d*$/.test(count) ? '人数' : '';
    if (!error) { this.setData({ feedback: '演示提交成功。', error: '' }); return; }
    if (good) { this.setData({ error }); return; }
    this.setData({ nickname: '', count: '', feedback: '格式错误' });
  },
  // 用视图自己的滚动事件记录位置，打开详情时卸载列表来模拟返回重建。
  rememberScroll(event) { this.lastTop = event.detail.scrollTop; },
  // 详情内容和列表都使用同一项数据。
  openRoom(event) { this.savedTop = this.lastTop || 0; this.setData({ detail: event.currentTarget.dataset.title }); },
  // 正例回到之前的视口，反例重置到第一项。
  backToRooms() { this.setData({ detail: '', scrollTop: this.data.good ? this.savedTop : 0 }); },
  // 分享只指向公开教学页。
  onShareAppMessage() { return { title: '三组微信小程序交互正反例', path: '/pages/ui-cases/index' }; }
});
