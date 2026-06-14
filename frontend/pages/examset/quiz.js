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

    this.setData({
      answered: true,
      selectedOption: option,
      isCorrect,
      answers,
      ...cls,
    })
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
    let correctCount = 0
    const wrongList = []
    for (let i = 0; i < total; i++) {
      const ans = answers[i] || ''
      if (ans.toUpperCase() === this.data.questions[i].answer.toUpperCase()) {
        correctCount++
      } else if (ans) {
        wrongList.push({
          sort: i + 1,
          title: this.data.questions[i].title,
          answer: this.data.questions[i].answer,
        })
      }
    }
    const wrongCount = total - correctCount
    const correctRate = Math.round((correctCount / total) * 100)

    this.setData({
      submitted: true,
      correctCount,
      correctRate,
      wrongCount,
      wrongList,
      passed: correctRate >= 90,
    })
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
