/**
 * 驾考学习 — 全局入口
 */
const api = require('./utils/api')
const CONFIG = require('./config')

App({
  globalData: {
    token: '',
    openid: '',
    isGuest: false,  // 游客模式
  },

  onLaunch() {
    // 云托管模式需要先初始化
    if (CONFIG.useCloud) {
      wx.cloud.init({
        env: CONFIG.cloudEnv,
      })
    }

    // 尝试从本地恢复登录态
    const token = wx.getStorageSync('token')
    const openid = wx.getStorageSync('openid')
    if (token && openid) {
      this.globalData.token = token
      this.globalData.openid = openid
    }
  },

  /** 尝试自动登录，失败则进入游客模式 */
  tryAutoLogin() {
    if (this.isLoggedIn()) return Promise.resolve(true)

    return new Promise(resolve => {
      wx.login({
        success: (res) => {
          if (res.code) {
            api.login(res.code)
              .then(data => {
                const { token, open_id } = data
                this.globalData.token = token
                this.globalData.openid = open_id
                wx.setStorageSync('token', token)
                wx.setStorageSync('openid', open_id)
                resolve(true)
              })
              .catch(() => {
                // 登录失败 → 游客模式
                this.globalData.isGuest = true
                resolve(false)
              })
          } else {
            this.globalData.isGuest = true
            resolve(false)
          }
        },
        fail: () => {
          this.globalData.isGuest = true
          resolve(false)
        },
      })
    })
  },

  /** 是否已登录 */
  isLoggedIn() {
    return !!this.globalData.token
  },
})
