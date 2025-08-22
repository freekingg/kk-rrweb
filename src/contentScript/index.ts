import { record, EventType, IncrementalSource, addCustomEvent } from 'rrweb';
import { getItem } from '../utils/helper';

let stopFn: any;
let isRecording = false;
let heartbeatTimer: number | null = null;
let lastHeartbeatTime = 0;
const HEARTBEAT_INTERVAL = 30000; // 30秒间隔

function sendEventToBackground(event: any) {
  chrome.runtime.sendMessage({
    type: 'rrweb-event',
    data: event,
  });
}

// 节流函数
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

// Input事件节流发送
const sendInputEvent = throttle((event: any) => {
  sendEventToBackground(event);
}, 1000);

// Selection事件节流发送
const sendSelectionEvent = throttle((event: any) => {
  sendEventToBackground(event);
}, 1000);

function shouldKeep(event: any): boolean {
  if (
    event.type === EventType.FullSnapshot ||
    event.type === EventType.DomContentLoaded ||
    event.type === EventType.Load ||
    event.type === EventType.Meta ||
    event.type === EventType.Custom // 确保心跳事件被保留
  )
    return true;

  if (event.type === EventType.IncrementalSnapshot) {
    const src = event.data.source;
    return (
      src === IncrementalSource.Input ||
      src === IncrementalSource.Mutation ||
      src === IncrementalSource.MouseInteraction ||
      src === IncrementalSource.Selection ||
      src === IncrementalSource.Scroll
    );
  }

  return false;
}

// 优化的心跳机制：使用requestAnimationFrame避免浏览器节流
function startHeartbeat() {
  // 清除旧定时器
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // 使用requestAnimationFrame实现更可靠的定时
  function checkHeartbeat() {
    if (!isRecording) return;

    const now = Date.now();
    // 检查是否到达心跳间隔
    if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
      lastHeartbeatTime = now;
      // console.log('[rrweb] 发送心跳事件');
    }

    // 继续循环检查（浏览器活跃时约16ms一次，后台时会自动降低频率但不会完全停止）
    requestAnimationFrame(checkHeartbeat);
  }

  // 启动心跳检查循环
  lastHeartbeatTime = Date.now();
  requestAnimationFrame(checkHeartbeat);
}

async function startRecord() {
  if (isRecording) return;

  const rrwebUid = await getItem('rrwebUid');
  if (!rrwebUid) return;
  
  // 启动优化后的心跳
  startHeartbeat();

  stopFn = record({
    emit(event: any) {

      // 输入事件单独处理（节流）
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.Input
      ) {
        sendInputEvent(event);
        return;
      }

       // Selection 事件节流
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.Selection
      ) {
        sendSelectionEvent(event);
        return;
      }

      // 其他事件照旧
      if (shouldKeep(event)) {
        sendEventToBackground(event);
      }
    },
    recordCanvas: false,
    collectFonts: false,
    inlineImages: false,
    maskAllInputs: false,
    maskTextClass: 'mask-text',
    blockClass: 'no-record',
    ignoreClass: 'ignore',
    slimDOMOptions: {
      script: false,
      comment: true,
      headFavicon: true,
      headWhitespace: true,
    },
    sampling: {
      scroll: 0,
      mousemove: 0,
      mouseInteraction: {
        MouseUp: true,
        MouseDown: true,
        Click: true,
        ContextMenu: false,
        DblClick: true,
        Focus: true,
        Blur: true,
        TouchStart: false,
        TouchEnd: false,
      },
      input: 'all',
    },
  });

  isRecording = true;
  console.log('[rrweb] started in tab', location.href);
}

function stopRecord() {
  if (!isRecording) return;
  
  isRecording = false;

  if (stopFn) {
    stopFn();
    stopFn = null;
    console.log('[rrweb] stopped in tab', location.href);
  }
}

// 监听background消息
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'start-record') {
    startRecord();
  }
  // if (msg.type === 'stop-record') {
  //   stopRecord();
  // }
});

// 初始化
chrome.storage.local.get('recording', async (res) => {
  console.log('recording res: ', res);
  const rrwebUid = await getItem('rrwebUid');
  if (!rrwebUid) return;
  if (res.recording === 'start') {
    startRecord();
  } 
});