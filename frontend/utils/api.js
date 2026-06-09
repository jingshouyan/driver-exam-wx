/**
 * 后端 API 封装
 */
const BASE_URL = 'http://localhost:8080/api/v1'

/** 通用请求 */
function request(method, path, data) {
  const app = getApp()
  const token = app.globalData.token || wx.getStorageSync('token')

  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      success(res) {
        if (res.data.code === 0) {
          resolve(res.data.data)
        } else if (res.statusCode === 401) {
          // token 过期，尝试刷新
          refreshToken().then(() => {
            // 重试请求
            request(method, path, data).then(resolve).catch(reject)
          }).catch(() => {
            // 刷新失败，重新登录
            wx.removeStorageSync('token')
            wx.removeStorageSync('openid')
            wx.navigateTo({ url: '/pages/index/index' })
            reject(new Error('登录已过期'))
          })
        } else {
          reject(new Error(res.data.msg || '请求失败'))
        }
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

/** 刷新 token */
function refreshToken() {
  const app = getApp()
  const token = wx.getStorageSync('token')
  if (!token) return Promise.reject(new Error('无 token'))

  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + '/auth/refresh',
      method: 'POST',
      header: { Authorization: 'Bearer ' + token },
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
  })
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
}
