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

// 节流函数（固定时间间隔执行）
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastTime = 0;
  return function(this: any, ...args: any[]) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  } as T;
}

// 专门处理 Selection 事件的节流发送
const sendSelectionEvent = throttle((event: any) => {
  sendEventToBackground(event);
}, 500); // 500ms 节流

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
      src === IncrementalSource.MouseInteraction ||
      src === IncrementalSource.Selection
    )
  }

  return false
}

async function startRecord() {
  console.log('startRecord isRecording: ', isRecording);
  if (isRecording) return

  const rrwebUid = await getItem('rrwebUid')
  if (!rrwebUid) {
    return
  }
  
  stopFn = record({
    emit(event: any) {
      if (shouldKeep(event)) {
        // 对 Selection 事件特殊处理
        if (
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.Selection
        ) {
          sendSelectionEvent(event);
        } else {
          sendEventToBackground(event); // 其他事件正常发送
        }
      }
    },
    // 关闭所有非必要监听
    recordCanvas: false,
    collectFonts: false,
    // inlineStylesheet: false,
    inlineImages: false,
    maskAllInputs: false,
    maskTextClass: 'mask-text', // 可自定义需要掩码的类
    blockClass: 'no-record', // 添加此类名元素不记录
    ignoreClass: 'ignore', // 忽略元素变化
    // 精简 DOM 快照
    slimDOMOptions: {
      script: false, // 移除所有 script
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
  console.log('[rrweb] started in tab', location.href)
}

function stopRecord() {
  // if (!isRecording) return
  // isRecording = false

  // if (stopFn) {
  //   stopFn()
  //   stopFn = null
  //   console.log('[rrweb] stopped in tab', location.href)
  // }
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
  console.log('res.recording: ', res);
  const rrwebUid = await getItem('rrwebUid')
  console.log('rrwebUid: ', rrwebUid);
  if (!rrwebUid) {
    return
  }
  if (res.recording === 'start') {
    startRecord()
  } else {
    stopRecord()
  }
})

// window.addEventListener('beforeunload', () => {
//   stopRecord()
// })
