const api = require('../../utils/api')
const storage = require('../../utils/storage')

Page({
  data: {
    subject: 1,
    sets: [],
  },

  onLoad(options) {
    const subject = parseInt(options.subject || 1)
    this.setData({ subject })
    this.loadList(subject)
  },

  loadList(subject) {
    wx.showLoading({ title: '加载中...' })
    api.getExamSets(subject).then(data => {
      this.setData({ sets: data || [] })
    }).catch(err => {
      console.error(err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  goQuiz(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/examset/quiz?setId=${id}&subject=${this.data.subject}`,
    })
  },
})
