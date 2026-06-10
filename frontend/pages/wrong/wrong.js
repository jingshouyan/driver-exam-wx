const storage = require('../../utils/storage')
const qutil = require('../../utils/question')

Page({
  data: {
    filterSubject: 0,
    wrongList: [],
    filteredList: [],
    expandedIndex: -1,
    optLabels: ['A', 'B', 'C', 'D'],
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const list = storage.getWrongQuestions().map(q => qutil.normalize(q))
    this.setData({ wrongList: list })
    this.filterList()
  },

  filterList() {
    const { wrongList, filterSubject } = this.data
    const filtered = filterSubject === 0
      ? wrongList
      : wrongList.filter(q => q.subject === filterSubject)
    this.setData({ filteredList: filtered })
  },

  setFilter(e) {
    const subject = parseInt(e.currentTarget.dataset.subject)
    this.setData({
      filterSubject: subject,
      expandedIndex: -1,
    })
    this.filterList()
  },

  toggleDetail(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({
      expandedIndex: this.data.expandedIndex === idx ? -1 : idx,
    })
  },

  toggleMark(e) {
    const id = e.currentTarget.dataset.id
    storage.toggleMark(id)
    this.loadData()
  },

  removeWrong(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认移出',
      content: '将该题移出错题本？',
      success: (res) => {
        if (res.confirm) {
          storage.removeWrongQuestion(id)
          this.loadData()
        }
      },
    })
  },

  clearSubject() {
    const { filterSubject } = this.data
    wx.showModal({
      title: '确认清空',
      content: filterSubject === 0
        ? '清空所有错题？此操作不可恢复。'
        : `清空科目${filterSubject}的错题？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          if (filterSubject === 0) {
            // 清空全部
            const all = storage.getWrongQuestions()
            all.forEach(q => storage.removeWrongQuestion(q.id))
          } else {
            storage.clearWrongBySubject(filterSubject)
          }
          this.loadData()
        }
      },
    })
  },

  getOption(item, index) {
    const key = 'option' + (index + 1)
    return item[key] || ''
  },
})
