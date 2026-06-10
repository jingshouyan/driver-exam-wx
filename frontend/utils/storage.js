/**
 * 本地存储工具
 * 管理 token、答题进度、错题本
 */
const qutil = require('./question')

const WRONG_KEY = 'wrong_questions'

/** 获取错题列表 */
function getWrongQuestions() {
  try {
    return wx.getStorageSync(WRONG_KEY) || []
  } catch {
    return []
  }
}

/** 添加错题 */
function addWrongQuestion(question) {
  const list = getWrongQuestions()
  // 去重
  if (!list.some(q => q.id === question.id)) {
    const normalized = qutil.normalize(question)
    list.unshift({
      id: normalized.id,
      subject: normalized.subject,
      question: normalized.question,
      option1: normalized.option1,
      option2: normalized.option2,
      option3: normalized.option3,
      option4: normalized.option4,
      answer: question.answer,
      explain: question.explain,
      pic: question.pic,
      // 标记回顾
      marked: false,
      wrongAt: Date.now(),
    })
    wx.setStorageSync(WRONG_KEY, list)
  }
}

/** 从错题本移除 */
function removeWrongQuestion(questionId) {
  const list = getWrongQuestions().filter(q => q.id !== questionId)
  wx.setStorageSync(WRONG_KEY, list)
}

/** 标记/取消标记回顾 */
function toggleMark(questionId) {
  const list = getWrongQuestions()
  const q = list.find(q => q.id === questionId)
  if (q) {
    q.marked = !q.marked
    wx.setStorageSync(WRONG_KEY, list)
  }
}

/** 清除某科目的错题 */
function clearWrongBySubject(subject) {
  const list = getWrongQuestions().filter(q => q.subject !== subject)
  wx.setStorageSync(WRONG_KEY, list)
}

module.exports = {
  getWrongQuestions,
  addWrongQuestion,
  removeWrongQuestion,
  toggleMark,
  clearWrongBySubject,
}
