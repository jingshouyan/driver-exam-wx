/**
 * 小程序配置
 *
 * 微信云托管部署后，将 apiBaseUrl 改为云托管分配的域名：
 *   在云托管控制台 → 服务详情 → 访问地址 中查看
 *
 * 示例：
 *   https://driver-exam-xxxxx.tsm.cloudwego.cn
 */
const CONFIG = {
  // 后端 API 基础地址（不需要包含 /api/v1）
  apiBaseUrl: 'http://localhost:8080',
}

module.exports = CONFIG
