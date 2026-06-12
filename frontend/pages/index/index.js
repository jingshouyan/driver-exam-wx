const storage = require('../../utils/storage')

Page({
  data: {
    selectedSubject: 0,
    wrongCount: 0,
    isGuest: false,
    result1: null,
    result4: null,
  },

  onShow() {
    this.checkLogin()
    this.loadWrongCount()
    this.loadPracticeResults()
  },

  /** 加载练习进度，兼容旧数据（total→answered） */
  loadPracticeResults() {
    const fix = (r) => r ? { ...r, answered: r.answered || r.total || 0 } : null
    this.setData({
      result1: fix(storage.getPracticeResult(1)),
      result4: fix(storage.getPracticeResult(4)),
    })
  },

  /** 自动登录，失败则游客模式 */
  checkLogin() {
    const app = getApp()
    if (app.isLoggedIn()) {
      this.setData({ isGuest: false })
      return
    }

    app.tryAutoLogin().then(loggedIn => {
      this.setData({ isGuest: !loggedIn })
    })
  },

  /** 错题数量 */
  loadWrongCount() {
    const wrong = storage.getWrongQuestions()
    this.setData({ wrongCount: wrong.length })
  },

  /** 选择科目 */
  selectSubject(e) {
    const subject = parseInt(e.currentTarget.dataset.subject)
    this.setData({
      selectedSubject: this.data.selectedSubject === subject ? 0 : subject,
    })
  },

  /** 前往练习模式 */
  goPractice() {
    wx.navigateTo({
      url: `/pages/practice/practice?subject=${this.data.selectedSubject}`,
    })
  },

  /** 前往模拟考试 */
  goExam() {
    wx.navigateTo({
      url: `/pages/exam/exam?subject=${this.data.selectedSubject}`,
    })
  },

  /** 前往错题本 */
  goWrongBook() {
    wx.navigateTo({ url: '/pages/wrong/wrong' })
  },
})
