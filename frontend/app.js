/**
 * 驾考学习 — 全局入口
 */
const api = require('./utils/api')

App({
  globalData: {
    token: '',
    openid: '',
  },

  onLaunch() {
    // 尝试从本地恢复登录态
    const token = wx.getStorageSync('token')
    const openid = wx.getStorageSync('openid')
    if (token && openid) {
      this.globalData.token = token
      this.globalData.openid = openid
    }
  },

  /** 登录：调用后端换取 token */
  login(code) {
    return api.login(code).then(res => {
      const { token, open_id } = res.data
      this.globalData.token = token
      this.globalData.openid = open_id
      wx.setStorageSync('token', token)
      wx.setStorageSync('openid', open_id)
      return res
    })
  },

  /** 是否已登录 */
  isLoggedIn() {
    return !!this.globalData.token
  },
})
