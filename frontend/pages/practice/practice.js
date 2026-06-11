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

    touchStartX: 0,
    isComplete: false,
    correctCount: 0,
    correctRate: 0,
    wrongList: [],
    optClassA: '',
    optClassB: '',
    optClassC: '',
    optClassD: '',
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

  /** 触摸开始（记录起点，用于滑动） */
  handleTouchStart(e) {
    this.setData({ touchStartX: e.touches[0].clientX })
  },

  /** 触摸结束（判断左滑/右滑） */
  handleTouchEnd(e) {
    const diff = e.changedTouches[0].clientX - this.data.touchStartX
    if (Math.abs(diff) < 50) return // 小于 50px 忽略
    if (diff < 0) {
      // 左滑 → 上一题
      this.prevQuestion()
    } else {
      // 右滑 → 下一题
      this.nextQuestion()
    }
  },

  /** 上一题 */
  prevQuestion() {
    if (this.data.currentIndex <= 0) return
    this.setData({
      currentIndex: this.data.currentIndex - 1,
      answered: false,
      selectedOption: '',
      isCorrect: false,
      optClassA: '',
      optClassB: '',
      optClassC: '',
      optClassD: '',
    })
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

    // 直接计算每个选项的 class，避免 WXML 函数调用问题
    const cls = { optClassA: '', optClassB: '', optClassC: '', optClassD: '' }
    const opts = ['A', 'B', 'C', 'D']
    for (const o of opts) {
      if (option === o) {
        cls['optClass' + o] = isCorrect ? 'correct' : 'wrong'
      } else if (question.answer.toUpperCase() === o && !isCorrect) {
        cls['optClass' + o] = 'reveal'
      }
    }

    this.setData({
      answered: true,
      selectedOption: option,
      isCorrect,
      ...cls,
    })

    if (!isCorrect) {
      storage.addWrongQuestion(question)
      // 记录到本局错题列表，用于完成页展示
      const wrongList = this.data.wrongList
      wrongList.push({ ...question, userAnswer: option })
      this.setData({ wrongList })
    } else {
      // 答对后延迟自动进入下一题
      setTimeout(() => this.nextQuestion(), 600)
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
      optClassA: '',
      optClassB: '',
      optClassC: '',
      optClassD: '',
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

  /** 完成页错题选项样式 */
  wrongOptClass(item, opt) {
    const isUserAnswer = item.userAnswer === opt
    const isCorrectOpt = item.answer.toUpperCase() === opt.toUpperCase()
    if (isUserAnswer) return isCorrectOpt ? 'correct' : 'wrong'
    if (isCorrectOpt) return 'reveal'
    return ''
  },

  /** 返回首页 */
  goHome() {
    wx.navigateBack()
  },
})
