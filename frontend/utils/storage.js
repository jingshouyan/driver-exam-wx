/**
 * 本地存储工具
 * 管理 token、答题进度、错题本
 */
const api = require('./api')
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

// ── 题目缓存 ──

function cacheKey(subject) {
  return 'cached_questions_' + subject
}

function versionKey(subject) {
  return 'cache_version_' + subject
}

/** 保存题目缓存 */
function saveQuestionCache(subject, questions, version) {
  wx.setStorageSync(cacheKey(subject), questions)
  wx.setStorageSync(versionKey(subject), version)
}

/** 读取题目缓存 */
function getQuestionCache(subject) {
  return wx.getStorageSync(cacheKey(subject)) || []
}

/** 读取缓存版本号 */
function getCacheVersion(subject) {
  return wx.getStorageSync(versionKey(subject)) || ''
}

/** 缓存是否有效 */
function hasCache(subject) {
  const q = wx.getStorageSync(cacheKey(subject))
  return Array.isArray(q) && q.length > 0
}

// ── 分页同步 ──

/** 带重试的分页拉取 */
function fetchPageWithRetry(subject, page, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    const tryFetch = (n) => {
      api.getQuestions(subject, page, 100).then(resolve).catch(err => {
        if (n < maxRetries) {
          setTimeout(() => tryFetch(n + 1), 1000 * (n + 1))
        } else {
          reject(err)
        }
      })
    }
    tryFetch(1)
  })
}

/** 分页拉取全部题目并缓存，每页 100 条，失败重试 */
function syncAllQuestions(subject, serverVersion) {
  return fetchPageWithRetry(subject, 1).then(first => {
    const total = first.total || 0
    const pageSize = 100
    const totalPages = Math.ceil(total / pageSize)
    let all = first.questions || []

    if (totalPages <= 1) {
      const questions = all.map(q => qutil.normalize(q))
      saveQuestionCache(subject, questions, serverVersion)
      return questions
    }

    // 逐页拉取剩余页，每页最多重试 3 次
    const pages = []
    for (let p = 2; p <= totalPages; p++) {
      pages.push(p)
    }
    return pages.reduce((promise, page) => {
      return promise.then(() => new Promise(r => setTimeout(r, 300)))
             .then(() => fetchPageWithRetry(subject, page).then(data => {
        all = all.concat(data.questions || [])
      }))
    }, Promise.resolve()).then(() => {
      const questions = all.map(q => qutil.normalize(q))
      saveQuestionCache(subject, questions, serverVersion)
      return questions
    })
  })
}

// ── 练习进度 ──

const PROGRESS_KEY = 'practice_progress'

function saveProgress(subject, index) {
  wx.setStorageSync(PROGRESS_KEY + '_' + subject, index)
}

function getProgress(subject) {
  const idx = wx.getStorageSync(PROGRESS_KEY + '_' + subject)
  return typeof idx === 'number' ? idx : 0
}

// ── 图片缓存 ──

function picCacheKey(url) {
  return 'pic_' + url
}

function savePicCache(url, data) {
  wx.setStorageSync(picCacheKey(url), data)
}

function getPicCache(url) {
  return wx.getStorageSync(picCacheKey(url)) || null
}

// ── 练习结果 ──

function resultKey(subject) {
  return 'practice_result_' + subject
}

/** 保存练习结果 */
function savePracticeResult(subject, data) {
  wx.setStorageSync(resultKey(subject), { ...data, timestamp: Date.now() })
}

/** 读取练习结果 */
function getPracticeResult(subject) {
  return wx.getStorageSync(resultKey(subject)) || null
}

/** 清除练习结果 */
function clearPracticeResult(subject) {
  wx.removeStorageSync(resultKey(subject))
}

module.exports = {
  getWrongQuestions,
  addWrongQuestion,
  removeWrongQuestion,
  toggleMark,
  clearWrongBySubject,
  saveQuestionCache,
  getQuestionCache,
  getCacheVersion,
  hasCache,
  saveProgress,
  getProgress,
  syncAllQuestions,
  savePicCache,
  getPicCache,
  savePracticeResult,
  getPracticeResult,
  clearPracticeResult,
}
