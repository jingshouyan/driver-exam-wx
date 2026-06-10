const api = require('../../utils/api')
const storage = require('../../utils/storage')
const qutil = require('../../utils/question')

Page({
  data: {
    subject: 0,
    questions: [],
    currentIndex: 0,
    answered: false,
    selectedOption: '',
    isCorrect: false,

    isComplete: false,
    correctCount: 0,
    correctRate: 0,
  },

  onLoad(options) {
    const subject = parseInt(options.subject || 1)
    this.setData({ subject })
    this.loadQuestions(subject)
  },

  /** 加载题目 */
  loadQuestions(subject) {
    wx.showLoading({ title: '加载中...' })
    api.getQuestions(subject, 1, 100)
      .then(data => {
        const questions = (data.questions || []).map(q => ({ ...qutil.normalize(q), marked: false }))
        this.setData({ questions })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
        console.error(err)
      })
  },

  /** 获取选项样式 */
  getOptionClass(item, opt) {
    if (!this.data.answered) {
      return this.data.selectedOption === opt ? 'selected' : ''
    }
    const isCorrectOpt = item.answer.toUpperCase() === opt.toUpperCase()
    if (this.data.selectedOption === opt) {
      return this.data.isCorrect ? 'correct' : 'wrong'
    }
    if (isCorrectOpt && !this.data.isCorrect) {
      return 'reveal'
    }
    return ''
  },

  /** 选择选项（手动点击） */
  selectOption(e) {
    if (this.data.answered) return
    const option = e.currentTarget.dataset.option
    this.checkAnswer(option)
  },

  /** 检查答案 */
  checkAnswer(option) {
    const question = this.data.questions[this.data.currentIndex]
    const isCorrect = option.toUpperCase() === question.answer.toUpperCase()

    this.setData({
      answered: true,
      selectedOption: option,
      isCorrect,
    })

    if (!isCorrect) {
      storage.addWrongQuestion(question)
    }
  },

  /** 下一题 */
  nextQuestion() {
    const nextIndex = this.data.currentIndex + 1
    if (nextIndex >= this.data.questions.length) {
      this.finishPractice()
      return
    }
    this.setData({
      currentIndex: nextIndex,
      answered: false,
      selectedOption: '',
      isCorrect: false,
    })
  },

  /** 完成练习 */
  finishPractice() {
    const total = this.data.questions.length
    // 统计正确数（从错题本反推）
    const wrongIds = storage.getWrongQuestions()
      .filter(w => w.subject === this.data.subject)
      .map(w => w.id)
    const correctCount = total - wrongIds.filter(id => 
      this.data.questions.some(q => q.id === id)
    ).length
    const correctRate = Math.round((correctCount / total) * 100)

    this.setData({
      isComplete: true,
      correctCount,
      correctRate,
    })
  },

  /** 标记回顾 */
  toggleMark() {
    const q = this.data.questions[this.data.currentIndex]
    q.marked = !q.marked
    storage.toggleMark(q.id)
    this.setData({ questions: this.data.questions })
  },

  /** 返回首页 */
  goHome() {
    wx.navigateBack()
  },
})
