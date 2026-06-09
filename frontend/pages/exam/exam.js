const api = require('../../utils/api')
const storage = require('../../utils/storage')
const voice = require('../../utils/voice')

Page({
  data: {
    subject: 0,
    questions: [],
    currentIndex: 0,
    selectedOption: '',
    answers: [],
    voiceEnabled: true,
    asrActive: false,
    submitted: false,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    wrongList: [],
  },

  onLoad(options) {
    const subject = parseInt(options.subject || 1)
    this.setData({ subject })
    this.loadQuestions(subject)
    voice.initASR(this.onASRResult)
  },

  onUnload() {
    voice.stopTTS()
    voice.stopASR()
  },

  /** 加载题目 */
  loadQuestions(subject) {
    wx.showLoading({ title: '加载中...' })
    api.getQuestions(subject, 1, 100)
      .then(data => {
        const questions = (data.questions || []).map(q => ({ ...q, marked: false }))
        this.setData({ 
          questions,
          answers: new Array(questions.length).fill(''),
        })
        wx.hideLoading()
        if (questions.length > 0) {
          this.autoPlayVoice()
        }
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
        console.error(err)
      })
  },

  formatOption(text) {
    if (!text) return ''
    return text.replace(/^[A-D]、/, '')
  },

  /** 选择选项 */
  selectOption(e) {
    const option = e.currentTarget.dataset.option
    const answers = this.data.answers
    answers[this.data.currentIndex] = option
    this.setData({ selectedOption: option, answers })
  },

  /** 下一题或交卷 */
  nextQuestion() {
    // 如果没选答案，提醒
    if (!this.data.selectedOption) {
      wx.showToast({ title: '请先选择一个答案', icon: 'none' })
      return
    }

    // 检查答案，记录错题
    const question = this.data.questions[this.data.currentIndex]
    const isCorrect = this.data.selectedOption.toUpperCase() === question.answer.toUpperCase()
    if (!isCorrect) {
      storage.addWrongQuestion(question)
    }

    const nextIndex = this.data.currentIndex + 1
    if (nextIndex >= this.data.questions.length) {
      this.submitExam()
      return
    }

    this.setData({
      currentIndex: nextIndex,
      selectedOption: this.data.answers[nextIndex] || '',
    })
    this.autoPlayVoice()
  },

  /** 交卷 */
  submitExam() {
    voice.stopTTS()
    voice.stopASR()

    let correctCount = 0
    const wrongList = []

    this.data.questions.forEach((q, i) => {
      const userAnswer = this.data.answers[i]
      if (userAnswer && userAnswer.toUpperCase() === q.answer.toUpperCase()) {
        correctCount++
      } else {
        wrongList.push(q)
      }
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

  /** 切换语音 */
  toggleVoice() {
    const enabled = !this.data.voiceEnabled
    this.setData({ voiceEnabled: enabled })
    if (enabled) {
      this.autoPlayVoice()
    } else {
      voice.stopTTS()
      voice.stopASR()
    }
  },

  /** 自动播报 */
  autoPlayVoice() {
    if (!this.data.voiceEnabled || this.data.submitted) return
    const q = this.data.questions[this.data.currentIndex]
    if (!q) return

    voice.playText(q.question, () => {
      this.setData({ asrActive: true })
      voice.startASR()
    }).catch(err => {
      console.error('TTS error:', err)
    })
  },

  /** ASR 结果 */
  onASRResult(text) {
    this.setData({ asrActive: false })
    if (this.data.submitted) return
    const match = text.match(/[ABCD]/)
    if (match) {
      this.selectOption({ currentTarget: { dataset: { option: match[0] } } })
    }
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
