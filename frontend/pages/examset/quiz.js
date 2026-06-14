const api = require('../../utils/api')

Page({
  data: {
    setId: 0,
    subject: 1,
    questions: [],
    currentIndex: 0,
    answered: false,
    selectedOption: '',
    isCorrect: false,
    submitted: false,
    correctCount: 0,
    correctRate: 0,
    wrongCount: 0,
    wrongList: [],
    passed: false,
    optClassA: '',
    optClassB: '',
    optClassC: '',
    optClassD: '',
    timeStr: '',
    touchStartX: 0,
  },

  onLoad(options) {
    const setId = parseInt(options.setId)
    const subject = parseInt(options.subject || 1)
    this.setData({ setId, subject })
    this.loadQuestions(setId)
  },

  loadQuestions(setId) {
    wx.showLoading({ title: '加载中...' })
    api.getExamSetQuestions(setId).then(questions => {
      this.setData({ questions })
      this._loadCurrentPic()
    }).catch(err => {
      console.error(err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  _loadCurrentPic() {
    const q = this.data.questions[this.data.currentIndex]
    if (!q || !q.sub_pic) return
    // 图片 URL 已含完整前缀，直接使用
  },

  handleTouchStart(e) {
    this.setData({ touchStartX: e.touches[0].clientX })
  },

  handleTouchEnd(e) {
    const diff = e.changedTouches[0].clientX - this.data.touchStartX
    if (Math.abs(diff) < 50) return
    if (diff < 0) this.nextQuestion()
    else this.prevQuestion()
  },

  prevQuestion() {
    if (this.data.currentIndex <= 0) return
    const prevIdx = this.data.currentIndex - 1
    const prevAnswer = this.data.answers ? this.data.answers[prevIdx] || '' : ''
    this._restoreQuestion(prevIdx, prevAnswer)
  },

  _restoreQuestion(index, answer) {
    const q = this.data.questions[index]
    if (!answer || !q) {
      this.setData({
        currentIndex: index,
        answered: false,
        selectedOption: '',
        isCorrect: false,
        optClassA: '',
        optClassB: '',
        optClassC: '',
        optClassD: '',
      })
      return
    }
    const isCorrect = answer.toUpperCase() === q.answer.toUpperCase()
    const cls = this._calcOptClass(answer, isCorrect, q.answer)
    this.setData({
      currentIndex: index,
      answered: true,
      selectedOption: answer,
      isCorrect,
      ...cls,
    })
  },

  selectOption(e) {
    if (this.data.answered) return
    const option = e.currentTarget.dataset.option
    this.checkAnswer(option)
  },

  checkAnswer(option) {
    const question = this.data.questions[this.data.currentIndex]
    const isCorrect = option.toUpperCase() === question.answer.toUpperCase()
    const cls = this._calcOptClass(option, isCorrect, question.answer)

    // 记录答案
    const answers = this.data.answers || []
    answers[this.data.currentIndex] = option

    // 实时更新正确/错误计数
    const stats = this._calcStats(answers)

    this.setData({
      answered: true,
      selectedOption: option,
      isCorrect,
      answers,
      ...cls,
      correctCount: stats.correctCount,
      wrongCount: stats.wrongCount,
    })

    // 答对后延迟自动下一题
    if (isCorrect) {
      setTimeout(() => this.nextQuestion(), 600)
    }
  },

  /** 统计正确/错误数 */
  _calcStats(answers) {
    let correctCount = 0
    let wrongCount = 0
    for (let i = 0; i < this.data.questions.length; i++) {
      const ans = answers[i] || ''
      if (!ans) continue
      if (ans.toUpperCase() === this.data.questions[i].answer.toUpperCase()) {
        correctCount++
      } else {
        wrongCount++
      }
    }
    return { correctCount, wrongCount }
  },

  _calcOptClass(option, isCorrect, answer) {
    const cls = { optClassA: '', optClassB: '', optClassC: '', optClassD: '' }
    const opts = ['A', 'B', 'C', 'D']
    for (const o of opts) {
      if (option === o) {
        cls['optClass' + o] = isCorrect ? 'correct' : 'wrong'
      } else if (answer.toUpperCase() === o && !isCorrect) {
        cls['optClass' + o] = 'reveal'
      }
    }
    return cls
  },

  nextQuestion() {
    const nextIndex = this.data.currentIndex + 1
    if (nextIndex >= this.data.questions.length) {
      this.finishQuiz()
      return
    }
    const nextAnswer = this.data.answers ? this.data.answers[nextIndex] || '' : ''
    this._restoreQuestion(nextIndex, nextAnswer)
  },

  finishQuiz() {
    const total = this.data.questions.length
    const answers = this.data.answers || []
    const stats = this._calcStats(answers)
    const wrongList = []
    for (let i = 0; i < total; i++) {
      const ans = answers[i] || ''
      if (ans && ans.toUpperCase() !== this.data.questions[i].answer.toUpperCase()) {
        wrongList.push(this.data.questions[i])
      }
    }
    const correctRate = Math.round((stats.correctCount / total) * 100)

    this.setData({
      submitted: true,
      correctCount: stats.correctCount,
      correctRate,
      wrongCount: stats.wrongCount,
      wrongList,
      passed: correctRate >= 90,
    })
  },

  /** 重做错题 */
  redoWrong() {
    if (!this.data.wrongList || this.data.wrongList.length === 0) return
    this.setData({
      questions: this.data.wrongList,
      currentIndex: 0,
      answered: false,
      selectedOption: '',
      isCorrect: false,
      submitted: false,
      correctCount: 0,
      correctRate: 0,
      wrongCount: 0,
      wrongList: [],
      passed: false,
      answers: [],
      optClassA: '',
      optClassB: '',
      optClassC: '',
      optClassD: '',
    })
  },

  /** 图片预览 */
  previewPic(e) {
    const src = e.currentTarget.dataset.src
    if (src) wx.previewImage({ current: src, urls: [src] })
  },

  goBack() {
    wx.navigateBack()
  },

  restart() {
    this.setData({
      currentIndex: 0,
      answered: false,
      selectedOption: '',
      isCorrect: false,
      submitted: false,
      correctCount: 0,
      correctRate: 0,
      wrongCount: 0,
      wrongList: [],
      passed: false,
      answers: [],
      optClassA: '',
      optClassB: '',
      optClassC: '',
      optClassD: '',
      timeStr: '',
    })
  },
})
