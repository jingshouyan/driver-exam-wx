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
    touchStartX: 0,

    optClassA: '',
    optClassB: '',
    optClassC: '',
    optClassD: '',
    submitted: false,
    answered: false,
    isCorrect: false,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    wrongList: [],
    timeLeft: 0,
    timeStr: '00:00',
    timerClass: '',
    _timer: null,
  },

  onLoad(options) {
    const subject = parseInt(options.subject || 1)
    this.setData({ subject })
    this.loadQuestions(subject)
  },

  /** 加载题目：从缓存随机抽 100 题 */
  loadQuestions(subject) {
    wx.showLoading({ title: '抽题中...' })

    if (!storage.hasCache(subject)) {
      // 无缓存 → 先分页拉取全部缓存
      wx.showLoading({ title: '正在更新题库...' })
      storage.syncAllQuestions(
        subject,
        '',
        (page, total) => {
          wx.showLoading({ title: `同步中 ${page}/${total} 页...` })
        }
      ).then(() => {
        this._startExam(subject)
        this._loadCurrentPic()
      }).catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
        console.error(err)
      })
    } else {
      this._startExam(subject)
    }
  },

  /** 懒加载当前题目的图片 */
  _loadCurrentPic() {
    const q = this.data.questions[this.data.currentIndex]
    if (!q || !q.pic) return
    const cached = storage.getPicCache(q.pic)
    if (cached) {
      this.setData({ [`questions[${this.data.currentIndex}].picData`]: cached })
      return
    }
    api.getPicByURL(q.pic).then(data => {
      storage.savePicCache(q.pic, data)
      this.setData({ [`questions[${this.data.currentIndex}].picData`]: data })
    }).catch(() => {})
  },

  /** 格式化 mm:ss */
  _formatTime(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
  },

  /** 开启倒计时 科目1=45min 科目4=30min */
  _startTimer() {
    const duration = this.data.subject === 1 ? 2700 : 1800
    this.setData({ timeLeft: duration, timeStr: this._formatTime(duration), timerClass: '' })
    if (this.data._timer) clearInterval(this.data._timer)
    const timer = setInterval(() => {
      let t = this.data.timeLeft - 1
      if (t <= 0) {
        t = 0
        clearInterval(timer)
        this._timerExpired()
      }
      this.setData({
        timeLeft: t,
        timerClass: t <= 60 ? 'timer-warn' : '',
        timeStr: this._formatTime(t),
      })
    }, 1000)
    this.data._timer = timer
  },

  /** 倒计时结束自动交卷 */
  _timerExpired() {
    wx.showToast({ title: '时间到，自动交卷', icon: 'none', duration: 2000 })
    setTimeout(() => this.submitExam(), 1000)
  },

  /** 停止计时 */
  _stopTimer() {
    if (this.data._timer) {
      clearInterval(this.data._timer)
      this.data._timer = null
    }
  },

  /** 从缓存中随机抽题 */
  _startExam(subject) {
    const all = storage.getQuestionCache(subject).map(q => ({ ...qutil.normalize(q), marked: false }))
    // 随机打乱并取前 100 题
    const shuffled = this._shuffle(all)
    const examSize = Math.min(100, shuffled.length)
    const questions = shuffled.slice(0, examSize)
    this.setData({
      questions,
      answers: new Array(questions.length).fill(''),
    })
    this._loadCurrentPic()
    this._startTimer()
    wx.hideLoading()
  },

  /** Fisher-Yates 洗牌 */
  _shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  },

  /** 触摸开始 */
  handleTouchStart(e) {
    this.setData({ touchStartX: e.touches[0].clientX })
  },

  /** 触摸结束 */
  handleTouchEnd(e) {
    if (this.data.submitted) return
    const diff = e.changedTouches[0].clientX - this.data.touchStartX
    if (Math.abs(diff) < 50) return
    if (diff < 0) {
      this.nextQuestion()
    } else {
      this.prevQuestion()
    }
  },

  /** 上一题 */
  prevQuestion() {
    if (this.data.currentIndex <= 0) return
    const prevIdx = this.data.currentIndex - 1
    this._restoreQuestion(prevIdx)
  },

  /** 根据 answers 恢复题目状态 */
  _restoreQuestion(index) {
    const answer = this.data.answers[index] || ''
    const q = this.data.questions[index]
    if (!answer || !q) {
      this.setData({
        currentIndex: index,
        selectedOption: '',
        answered: false,
        isCorrect: false,
        optClassA: '',
        optClassB: '',
        optClassC: '',
        optClassD: '',
      })
      this._loadCurrentPic()
      return
    }
    const isCorrect = answer.toUpperCase() === q.answer.toUpperCase()
    const cls = { optClassA: '', optClassB: '', optClassC: '', optClassD: '' }
    const opts = ['A', 'B', 'C', 'D']
    for (const o of opts) {
      if (answer === o) {
        cls['optClass' + o] = isCorrect ? 'correct' : 'wrong'
      } else if (q.answer.toUpperCase() === o && !isCorrect) {
        cls['optClass' + o] = 'reveal'
      }
    }
    this.setData({
      currentIndex: index,
      selectedOption: answer,
      answered: true,
      isCorrect,
      ...cls,
    })
    this._loadCurrentPic()
  },

  /** 选择选项 */
  selectOption(e) {
    if (this.data.answered) return
    const option = e.currentTarget.dataset.option
    const question = this.data.questions[this.data.currentIndex]
    const isCorrect = option.toUpperCase() === question.answer.toUpperCase()

    // 直接计算每个选项的 class
    const cls = { optClassA: '', optClassB: '', optClassC: '', optClassD: '' }
    const opts = ['A', 'B', 'C', 'D']
    for (const o of opts) {
      if (option === o) {
        cls['optClass' + o] = isCorrect ? 'correct' : 'wrong'
      } else if (question.answer.toUpperCase() === o && !isCorrect) {
        cls['optClass' + o] = 'reveal'
      }
    }

    const answers = this.data.answers
    answers[this.data.currentIndex] = option
    this.setData({
      selectedOption: option,
      answers,
      answered: true,
      isCorrect,
      ...cls,
    })
    // 选完后延迟自动进入下一题
    setTimeout(() => this.nextQuestion(), 500)
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
      const q = this.data.questions[this.data.currentIndex]
      const alreadyWrong = storage.getWrongQuestions().some(x => x.id === q.id)
      storage.addWrongQuestion(q)
      if (alreadyWrong) storage.toggleMark(q.id)
    }

    const nextIndex = this.data.currentIndex + 1
    if (nextIndex >= this.data.questions.length) {
      this.submitExam()
      return
    }

    this._restoreQuestion(nextIndex)
  },

  /** 交卷 */
  submitExam() {
    this._stopTimer()

    let correctCount = 0
    const wrongList = []

    this.data.questions.forEach((q, i) => {
      const userAnswer = this.data.answers[i]
      if (userAnswer && userAnswer.toUpperCase() === q.answer.toUpperCase()) {
        correctCount++
      } else {
        wrongList.push({ ...q, userAnswer })
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

  /** 离开页面时停止计时 */
  onUnload() {
    this._stopTimer()
  },

  /** 交卷后错题选项样式 */
  wrongOptClass(item, opt) {
    const isUserAnswer = item.userAnswer === opt
    const isCorrectOpt = item.answer.toUpperCase() === opt.toUpperCase()
    if (isUserAnswer) return isCorrectOpt ? 'correct' : 'wrong'
    if (isCorrectOpt) return 'reveal'
    return ''
  },

  /** 图片预览 */
  previewPic(e) {
    const src = e.currentTarget.dataset.src
    if (src) wx.previewImage({ current: src, urls: [src] })
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
