import { record, EventType, IncrementalSource } from 'rrweb'
import { getItem } from '../utils/helper'
let stopFn: any
let isRecording = false

function sendEventToBackground(event: any) {
  chrome.runtime.sendMessage({
    type: 'rrweb-event',
    data: event,
  })
}

function shouldKeep(event: any): boolean {
  if (
    event.type === EventType.FullSnapshot ||
    event.type === EventType.DomContentLoaded ||
    event.type === EventType.Load ||
    event.type === EventType.Meta
  )
    return true

  if (event.type === EventType.IncrementalSnapshot) {
    const src = event.data.source
    return (
      src === IncrementalSource.Input ||
      src === IncrementalSource.Mutation ||
      src === IncrementalSource.MouseInteraction 
    )
  }

  return false
}

let initing = false
async function startRecord() {
  if (isRecording || initing) return

  const booleanUid = await getItem('booleanUid')
  if (!booleanUid) {
    return
  }
  
  stopFn = record({
    emit(event: any) {
      if (shouldKeep(event)) {
        sendEventToBackground(event)
      }
    },
    // 关闭所有非必要监听
    recordCanvas: false,
    collectFonts: false,
    inlineStylesheet: false,
    inlineImages: false,
    maskAllInputs: true,
    maskTextClass: 'mask-text', // 可自定义需要掩码的类
    blockClass: 'no-record', // 添加此类名元素不记录
    ignoreClass: 'ignore', // 忽略元素变化
    // 精简 DOM 快照
    slimDOMOptions: {
      script: true, // 移除所有 script
      comment: true, // 移除注释
      headFavicon: true, // 移除 favicon
      headWhitespace: true, // 移除头部空白
    },
    // 数据采样
    sampling: {
      scroll: 0, // 完全禁用滚动
      mousemove: 0, // 完全禁用鼠标移动
      mouseInteraction: {
        MouseUp: false,
        MouseDown: false,
        Click: true, // 只保留点击
        ContextMenu: false,
        DblClick: false,
        Focus: false,
        Blur: false,
        TouchStart: false,
        TouchEnd: false,
      },
      input: 'last', // 输入事件节流
    },
  })

  isRecording = true
  initing = false

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
chrome.storage.local.get('recording', async (res) => {
  const booleanUid = await getItem('booleanUid')
  if (!booleanUid) {
    return
  }
  if (res.recording === 'start') {
    startRecord()
  } else {
    stopRecord()
  }
})

window.addEventListener('beforeunload', () => {
  stopRecord()
})
