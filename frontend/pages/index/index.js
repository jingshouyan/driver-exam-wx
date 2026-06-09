const storage = require('../../utils/storage')

Page({
  data: {
    selectedSubject: 0,
    wrongCount: 0,
  },

  onShow() {
    this.checkLogin()
    this.loadWrongCount()
  },

  /** 检查登录状态，未登录则触发微信登录 */
  checkLogin() {
    const app = getApp()
    if (app.isLoggedIn()) return

    wx.login({
      success: (res) => {
        if (res.code) {
          app.login(res.code).catch((err) => {
            wx.showToast({ title: '登录失败', icon: 'none' })
            console.error('login error:', err)
          })
        }
      },
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
