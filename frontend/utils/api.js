/**
 * 后端 API 封装
 *
 * 支持两种模式：
 *   1. wx.cloud.callContainer（云托管部署）
 *   2. wx.request（本地开发）
 *
 * 模式切换在 config.js 中配置
 */
const CONFIG = require('../config')
const CLOUD_MODE = CONFIG.useCloud
const BASE_URL = CONFIG.apiBaseUrl + '/api/v1'

/**
 * 通用请求
 * 自动选择 cloud.callContainer 或 wx.request
 */
function request(method, path, data) {
  const app = getApp()
  const token = app.globalData.token || wx.getStorageSync('token')

  return new Promise((resolve, reject) => {
    const commonHeader = {
      'Content-Type': 'application/json',
      ...(token && !CLOUD_MODE ? { Authorization: 'Bearer ' + token } : {}),
    }

    if (CLOUD_MODE) {
      // === 云托管模式 ===
      const callOpts = {
        config: { env: CONFIG.cloudEnv },
        path: '/api/v1' + path,
        method,
        header: {
          ...commonHeader,
          'X-WX-SERVICE': CONFIG.cloudService,
        },
      }
      // GET 请求不传 body，避免空 data 引发云托管异常
      if (data !== undefined && method !== 'GET') {
        callOpts.data = data
      }
      wx.cloud.callContainer(callOpts)
        success(res) {
          // callContainer 的响应在 res.data 里
          const body = res.data
          if (body.code === 0) {
            resolve(body.data)
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            handleTokenExpired(method, path, data).then(resolve).catch(reject)
          } else {
            reject(new Error(body.msg || '请求失败'))
          }
        },
        fail(err) {
          reject(new Error(err.errMsg || '网络错误'))
        },
      })
    } else {
      // === 本地开发模式 ===
      wx.request({
        url: BASE_URL + path,
        method,
        data,
        header: commonHeader,
        success(res) {
          if (res.data.code === 0) {
            resolve(res.data.data)
          } else if (res.statusCode === 401) {
            handleTokenExpired(method, path, data).then(resolve).catch(reject)
          } else {
            reject(new Error(res.data.msg || '请求失败'))
          }
        },
        fail(err) {
          reject(new Error(err.errMsg || '网络错误'))
        },
      })
    }
  })
}

/** token 过期处理：刷新后重试 */
function handleTokenExpired(method, path, data) {
  return refreshToken().then(() => {
    return request(method, path, data)
  }).catch(() => {
    // 刷新失败，清登录态
    wx.removeStorageSync('token')
    wx.removeStorageSync('openid')
    wx.navigateTo({ url: '/pages/index/index' })
    throw new Error('登录已过期')
  })
}

/** 刷新 token */
function refreshToken() {
  const app = getApp()
  const token = wx.getStorageSync('token')
  if (!token) return Promise.reject(new Error('无 token'))

  return new Promise((resolve, reject) => {
    const doRefresh = () => {
      const opts = {
        method: 'POST',
        data: {},
        header: { Authorization: 'Bearer ' + token },
      }

      if (CLOUD_MODE) {
        wx.cloud.callContainer({
          config: { env: CONFIG.cloudEnv },
          path: '/api/v1/auth/refresh',
          ...opts,
          header: {
            ...opts.header,
            'X-WX-SERVICE': CONFIG.cloudService,
            'Content-Type': 'application/json',
          },
          success(res) {
            if (res.data && res.data.code === 0) {
              const newToken = res.data.data.token
              app.globalData.token = newToken
              wx.setStorageSync('token', newToken)
              resolve()
            } else {
              reject(new Error('刷新失败'))
            }
          },
          fail: reject,
        })
      } else {
        wx.request({
          url: BASE_URL + '/auth/refresh',
          ...opts,
          success(res) {
            if (res.data.code === 0) {
              const newToken = res.data.data.token
              app.globalData.token = newToken
              wx.setStorageSync('token', newToken)
              resolve()
            } else {
              reject(new Error('刷新失败'))
            }
          },
          fail: reject,
        })
      }
    }
    doRefresh()
  })
}

/** 获取题目版本时间戳 */
function getQuestionsVersion(subject) {
  return request('GET', `/questions/version?subject=${subject}`)
}

/** 获取全部题目（用于本地缓存，最多 2000 题） */
function getAllQuestions(subject) {
  return request('GET', `/questions?subject=${subject}&page=1&size=2000`)
}

/** 微信登录 */
function login(code) {
  return request('POST', '/auth/login', { code })
}

/** 获取题目列表 */
function getQuestions(subject, page = 1, size = 100) {
  return request('GET', `/questions?subject=${subject}&page=${page}&size=${size}`)
}

module.exports = {
  login,
  getQuestions,
  getQuestionsVersion,
  getAllQuestions,
}
