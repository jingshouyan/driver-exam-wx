const api = require('../../utils/api')
const storage = require('../../utils/storage')
const qutil = require('../../utils/question')

Page({
  data: {
    subject: 0,
    questions: [],
    currentIndex: 0,
    answers: [],   // 每道题选择的选项字母
    answered: false,
    selectedOption: '',
    isCorrect: false,

    touchStartX: 0,
    isComplete: false,
    correctCount: 0,
    correctRate: 0,
    total: 0,
    lastResult: null,
    wrongList: [],
    optClassA: '',
    optClassB: '',
    optClassC: '',
    optClassD: '',
  },

  onLoad(options) {
    const subject = parseInt(options.subject || 1)
    const stats = storage.getPracticeStats(subject)
    const lastResult = stats ? {
      correctCount: stats.totalCorrect,
      correctRate: Math.round((stats.totalCorrect / stats.totalAnswered) * 100),
      totalAnswered: stats.totalAnswered,
      totalQuestions: storage.getQuestionCache(subject).length || 0,
    } : null
    this.setData({ subject, lastResult })
    this.loadQuestions(subject)
  },

  /** 加载题目：优先缓存，后台检查版本 */
  loadQuestions(subject) {
    wx.showLoading({ title: '加载中...' })

    // 从缓存加载
    if (storage.hasCache(subject)) {
      const cached = storage.getQuestionCache(subject).map(q => ({ ...qutil.normalize(q), marked: false }))
      const savedIdx = storage.getProgress(subject)
      const startIdx = savedIdx < cached.length ? savedIdx : 0
      this.setData({ questions: cached, currentIndex: startIdx })
      this._savePartialResult()
      this._loadCurrentPic()
      wx.hideLoading()
    }

    // 后台检查版本，需要更新则分页拉取
    api.getQuestionsVersion(subject).then(serverVersion => {
      const localVersion = storage.getCacheVersion(subject)
      if (serverVersion === localVersion) return // 已最新
      wx.showLoading({ title: '正在更新题库...' })
      return storage.syncAllQuestions(subject, serverVersion).then(questions => {
        const normalized = questions.map(q => ({ ...qutil.normalize(q), marked: false }))
        this.setData({ questions: normalized, currentIndex: 0 })
        storage.saveProgress(subject, 0)
        this._savePartialResult()
        this._loadCurrentPic()
      })
    }).catch(err => {
      console.error('sync error:', err)
    }).finally(() => {
      wx.hideLoading()
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
      // 左滑 → 下一题
      this.nextQuestion()
    } else {
      // 右滑 → 上一题
      this.prevQuestion()
    }
  },

  /** 上一题 */
  prevQuestion() {
    if (this.data.currentIndex <= 0) return
    const prevIdx = this.data.currentIndex - 1
    const prevAnswer = this.data.answers[prevIdx] || ''
    this._restoreQuestion(prevIdx, prevAnswer)
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

  /** 根据 answers 恢复题目的答题状态 */
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
      answered: true,
      selectedOption: answer,
      isCorrect,
      ...cls,
    })
    this._loadCurrentPic()
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

    // 记录本题答案
    const answers = this.data.answers
    answers[this.data.currentIndex] = option

    this.setData({
      answered: true,
      selectedOption: option,
      isCorrect,
      answers,
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
    // 每次答题后记录累计统计
    storage.updatePracticeStats(this.data.subject, question.id, isCorrect)
    this._savePartialResult()
  },

  /** 刷新显示的累计统计 */
  _savePartialResult() {
    const stats = storage.getPracticeStats(this.data.subject)
    if (!stats || stats.totalAnswered === 0) return
    const correctRate = Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    this.setData({
      lastResult: { correctCount: stats.totalCorrect, correctRate, totalAnswered: stats.totalAnswered, totalQuestions: this.data.questions.length },
    })
  },

  /** 离开页面时保存进度 */
  onHide() {
    this._savePartialResult()
  },

  /** 下一题 */
  nextQuestion() {
    const nextIndex = this.data.currentIndex + 1
    storage.saveProgress(this.data.subject, nextIndex)
    if (nextIndex >= this.data.questions.length) {
      this.finishPractice()
      return
    }
    const nextAnswer = this.data.answers[nextIndex] || ''
    this._restoreQuestion(nextIndex, nextAnswer)
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

    // 保存最终累计统计
    this._savePartialResult()

    this.setData({
      isComplete: true,
      correctCount,
      correctRate,
      total,
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

  /** 清除练习进度和结果 */
  clearProgress() {
    wx.showModal({
      title: '清除进度',
      content: '将清除练习进度和上次练习结果，确定吗？',
      success: (res) => {
        if (res.confirm) {
          storage.saveProgress(this.data.subject, 0)
          storage.clearPracticeStats(this.data.subject)
          this.setData({
            currentIndex: 0,
            lastResult: null,
            answered: false,
            selectedOption: '',
            isCorrect: false,
            optClassA: '',
            optClassB: '',
            optClassC: '',
            optClassD: '',
            answers: [],
          })
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  },

  /** 返回首页 */
  goHome() {
    wx.navigateBack()
  },
})
