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

  /** 加载累计练习进度 */
  loadPracticeResults() {
    const fmt = (s, subj) => {
      if (!s || s.totalAnswered === 0) return null
      const total = storage.getQuestionCache(subj).length || 0
      return {
        correctCount: s.totalCorrect,
        totalAnswered: s.totalAnswered,
        totalQuestions: total,
        correctRate: Math.round((s.totalCorrect / s.totalAnswered) * 100),
      }
    }
    this.setData({
      result1: fmt(storage.getPracticeStats(1), 1),
      result4: fmt(storage.getPracticeStats(4), 4),
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
