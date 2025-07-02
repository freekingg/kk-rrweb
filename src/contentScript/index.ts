import { record } from 'rrweb';

let stopFn: any
let isRecording = false

function sendEventToBackground(event: any) {
  chrome.runtime.sendMessage({
    type: 'rrweb-event',
    data: event
  });
}

function startRecord() {
  if (isRecording) return
  isRecording = true

  stopFn = record({
  emit(event) {
    sendEventToBackground(event)
  },
  sampling: {
    mousemove: false,
    mouseInteraction: false, // 关闭鼠标 hover/enter/leave 事件
    scroll: false,
    input: 'last', // 已是最优策略
  },
  recordCanvas: false,
  collectFonts: false,
  inlineStylesheet: false,
  maskAllInputs: true // 避免录入密码等敏感字段
})


  console.log('[rrweb] started in tab', location.href)
}

function stopRecord() {
  if (!isRecording) return
  isRecording = false

  if (stopFn) {
    stopFn()
    stopFn = null
    console.log('[rrweb] stopped in tab', location.href)
  }
}

// 监听 background 消息
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'start-record') {
    startRecord()
  }
  if (msg.type === 'stop-record') {
    stopRecord()
  }
})

// 初始化：是否需要启动
chrome.storage.local.get('recording', (res) => {
  if (!res.recording || res.recording === 'start') {
    startRecord()
  } else {
    stopRecord()
  }
})

window.addEventListener('beforeunload', () => {
  stopRecord()
})
