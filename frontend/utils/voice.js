/**
 * 语音工具 — 微信同声传译插件封装
 *
 * 插件 ID: wx069ba97219f66d99
 * 需在 app.json 中声明 plugins
 */

const plugin = requirePlugin('WechatSI')

/** 语音识别管理器 */
const manager = plugin.getRecordRecognitionManager()

let ttsPlaying = false
let asrListening = false

/** 初始化语音识别监听 */
function initASR(onResult) {
  manager.onRecognize = function (res) {
    // 中间识别结果（可做字幕效果）
  }

  manager.onStop = function (res) {
    asrListening = false
    if (res.result) {
      const text = res.result.trim().toUpperCase()
      onResult && onResult(text)
    }
  }

  manager.onError = function (res) {
    asrListening = false
    console.error('ASR error:', res.msg)
  }
}

/** 开始语音识别（朗读结束后自动调用） */
function startASR() {
  if (asrListening) return
  asrListening = true
  manager.start({
    lang: 'zh_CN',
  })
}

/** 停止语音识别 */
function stopASR() {
  if (!asrListening) return
  asrListening = false
  manager.stop()
}

/** 文字转语音播报（读题） */
function playText(text, onEnd) {
  return new Promise((resolve, reject) => {
    if (ttsPlaying) {
      plugin.textToSpeech({
        lang: 'zh_CN',
        tts: 'tts',
        content: '',
        success: function () {},
      })
    }

    ttsPlaying = true
    plugin.textToSpeech({
      lang: 'zh_CN',
      tts: 'tts',
      content: text,
      success: function (res) {
        const audio = wx.createInnerAudioContext()
        // 同声传译插件返回的语音文件路径
        audio.src = res.filename
        audio.play()

        audio.onEnded(() => {
          ttsPlaying = false
          audio.destroy()
          onEnd && onEnd()
          resolve()
        })

        audio.onError((err) => {
          ttsPlaying = false
          audio.destroy()
          console.error('TTS error:', err)
          reject(err)
        })
      },
      fail(err) {
        ttsPlaying = false
        reject(err)
      },
    })
  })
}

/** 停止朗读 */
function stopTTS() {
  if (ttsPlaying) {
    plugin.textToSpeech({
      lang: 'zh_CN',
      tts: 'tts',
      content: '',
      success: function () {},
    })
    ttsPlaying = false
  }
}

/** 当前语音播报状态 */
function isTTSPlaying() {
  return ttsPlaying
}

module.exports = {
  initASR,
  startASR,
  stopASR,
  playText,
  stopTTS,
  isTTSPlaying,
}
