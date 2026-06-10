/**
 * 小程序配置
 *
 * 本地开发（wx.request）：
 *   配置 apiBaseUrl，useCloud 设为 false
 *
 * 微信云托管（wx.cloud.callContainer）：
 *   配置 cloudEnv（环境 ID）和 cloudService（服务名）
 *   在云托管控制台 → 服务详情 中查看
 */
const CONFIG = {
  // 使用云托管方式（true=callContainer, false=wx.request）
  useCloud: false,

  // 云托管参数（useCloud=true 时生效）
  cloudEnv: 'prod-d9gwtm8c365502732',   // 环境 ID
  cloudService: 'golang-esdx',          // 服务名

  // 本地开发参数（useCloud=false 时生效）
  apiBaseUrl: 'http://localhost:8080',
}

module.exports = CONFIG
