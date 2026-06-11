const api = require('../../utils/api')
const storage = require('../../utils/storage')
const qutil = require('../../utils/question')

Page({
  data: {
    subject: 0,
    questions: [],
    currentIndex: 0,
    selectedOption: '',
    answers: [],

    submitted: false,
    answered: false,
    isCorrect: false,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    wrongList: [],
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
        this.setData({ 
          questions,
          answers: new Array(questions.length).fill(''),
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
        console.error(err)
      })
  },

  /** 选项样式：选择了、正确、错误、正确答案揭示 */
  getOptionClass(item, opt) {
    if (this.data.answered) {
      const isCorrectOpt = item.answer && item.answer.toUpperCase() === opt.toUpperCase()
      if (this.data.selectedOption === opt) {
        return this.data.isCorrect ? 'correct' : 'wrong'
      }
      if (isCorrectOpt && !this.data.isCorrect) {
        return 'reveal'
      }
      return ''
    }
    return this.data.selectedOption === opt ? 'selected' : ''
  },

  /** 选择选项 */
  selectOption(e) {
    if (this.data.answered) return
    const option = e.currentTarget.dataset.option
    const question = this.data.questions[this.data.currentIndex]
    const isCorrect = option.toUpperCase() === question.answer.toUpperCase()

    const answers = this.data.answers
    answers[this.data.currentIndex] = option
    this.setData({
      selectedOption: option,
      answers,
      answered: true,
      isCorrect,
    })
  },

  /** 下一题或交卷 */
  nextQuestion() {
    // 如果没选答案，提醒
    if (!this.data.selectedOption) {
      wx.showToast({ title: '请先选择一个答案', icon: 'none' })
      return
    }

    // 记录错题（selectOption 已设定 isCorrect）
    if (!this.data.isCorrect) {
      storage.addWrongQuestion(this.data.questions[this.data.currentIndex])
    }

    const nextIndex = this.data.currentIndex + 1
    if (nextIndex >= this.data.questions.length) {
      this.submitExam()
      return
    }

    this.setData({
      currentIndex: nextIndex,
      selectedOption: this.data.answers[nextIndex] || '',
      answered: false,
      isCorrect: false,
    })
  },

  /** 交卷 */
  submitExam() {

    let correctCount = 0
    const wrongList = []

    this.data.questions.forEach((q, i) => {
      const userAnswer = this.data.answers[i]
      if (userAnswer && userAnswer.toUpperCase() === q.answer.toUpperCase()) {
        correctCount++
      } else {
        wrongList.push({ ...q, userAnswer })
    })

    const total = this.data.questions.length
    const score = Math.round((correctCount / total) * 100)
    const wrongCount = total - correctCount

    this.setData({
      submitted: true,
      score,
      correctCount,
      wrongCount,
      wrongList,
    })
  },

  /** 标记回顾 */
  toggleMark() {
    const q = this.data.questions[this.data.currentIndex]
    q.marked = !q.marked
    storage.toggleMark(q.id)
    this.setData({ questions: this.data.questions })
  },

  /** 跳转到某题 */
  jumpTo(e) {
    const idx = parseInt(e.currentTarget.dataset.index)
    this.setData({
      currentIndex: idx,
      selectedOption: this.data.answers[idx] || '',
    })
  },

  /** 交卷后错题选项样式 */
  wrongOptClass(item, opt) {
    const isUserAnswer = item.userAnswer === opt
    const isCorrectOpt = item.answer.toUpperCase() === opt.toUpperCase()
    if (isUserAnswer) return isCorrectOpt ? 'correct' : 'wrong'
    if (isCorrectOpt) return 'reveal'
    return ''
  },

  goHome() {
    wx.navigateBack()
  },

  /** 去练习模式查看错题解析 */
  goPractice(e) {
    const q = e.currentTarget.dataset.item || this.data.wrongList[0]
    // 暂时返回首页，后续可以跳到错题本
    wx.navigateBack()
  },
})
