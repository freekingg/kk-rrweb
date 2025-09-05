// background.ts
import { addEvent, getEventsBySession, getRecentSessions, clearAllData } from '../utils/idb'
import { setItem, getItem, generateUUID } from '../utils/helper'
import { deflate } from 'pako'

console.log('[background] is running')

let rrwebUid: any = ''
let isRecording = false
let isPaused = false
let recordingStartTime: number | null = null
let pauseStartTime: number | null = null
let totalPauseTime = 0

const PROBABILITY = import.meta.env.VITE_PROBABILITY
const UPLOAD_INTERVAL = 3000
const MAX_BATCH_SIZE = 50

let eventBuffer: any[] = []
let uploadTimer: NodeJS.Timeout | null = null

function bufferEvent(event: any) {
  eventBuffer.push(event)

  // 批量控制：到达最大数量时立即上传
  if (eventBuffer.length >= MAX_BATCH_SIZE) {
    flushEvents()
    return
  }

  // 否则延迟上传（防止高频触发）
  if (!uploadTimer) {
    uploadTimer = setTimeout(() => {
      flushEvents()
    }, UPLOAD_INTERVAL)
  }
}

function encodeToBase64(uint8: Uint8Array): string {
  let binary = ''
  const len = uint8.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i])
  }
  return btoa(binary)
}

async function flushEvents() {
  if (eventBuffer.length === 0) return

  const batch = [...eventBuffer]
  eventBuffer = []
  if (uploadTimer) {
    clearTimeout(uploadTimer)
    uploadTimer = null
  }

  if (!rrwebUid) {
    rrwebUid = await getItem('rrwebUid')
  }

  const payload = {
      sessionId: rrwebUid,
      timestamp: Date.now(),
      count: batch.length,
      compressed: '', 
    }

  console.log('[upload] 准备上传：', payload)

  try {
    // 将事件数组压缩为 base64 格式
    const compressed = deflate(JSON.stringify(batch)) // Uint8Array

    const base64 = encodeToBase64(compressed)
    payload.compressed = base64
   

    // console.log('[upload] 准备上传：', payload)

    await fetch(import.meta.env.VITE_UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    console.log('[upload] ✅ 成功上传', batch.length, '条事件')
  } catch (err) {
    console.error('[upload] ❌ 上传失败:', err)
    // ✅ TODO：可加入失败重试逻辑，比如保存到 fallbackQueue 中
  }
}


async function broadcastToActiveTab(msg: any) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, msg)
    }
  } catch (err) {
    console.error('[background] Failed to send message to active tab:', err)
  }
}

async function broadcastToAllTabs(msg: any) {
  const tabs = await chrome.tabs.query({ url: ['<all_urls>'] })
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, msg)
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('message: ', message);
  switch (message.type) {
    case '__EXTENSION_MSG__': {
      if (message.data) {
        setItem('__EXTENSION_MSG__', message.data)
      }
      break
    }

    case 'rrweb-event': {
        const event = message.data
        isRecording = true
        bufferEvent(event)
      // }
      break
    }

    case 'get-recordings': {
      getRecentSessions()
        .then((sessions) => sendResponse({ sessions }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case 'get-events': {
      getEventsBySession(message.sessionId)
        .then((events) => sendResponse({ events }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case 'clear-recordings': {
      clearAllData()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case 'start-recording': {
      getItem('rrwebUid').then((res) => {
        rrwebUid = res ? res as string : generateUUID()
        setItem('rrwebUid', rrwebUid)
        handleStartRecording()
      })
      return true
    }

    case 'stop-recording': {
      isRecording = false
      setItem('recording', 'stop')
      return true
    }

    case 'get-recording-status': {
      const now = Date.now()
      const activeDuration = isRecording && recordingStartTime
        ? (isPaused ? pauseStartTime! : now) - recordingStartTime - totalPauseTime
        : 0

      sendResponse({ isRecording, isPaused, duration: activeDuration })
      return true
    }
  }
})

async function handleStartRecording() {
  const now = Date.now()
  // if (isPaused && pauseStartTime) {
  //   totalPauseTime += now - pauseStartTime
  //   pauseStartTime = null
  //   isPaused = false
  // } else {
  //   recordingStartTime = now
  //   totalPauseTime = 0
  //   isPaused = false
  // }
  isRecording = true
  console.log('handleStartRecording isRecording: ', isRecording);
  await setItem('recording', 'start')
  broadcastToActiveTab({ type: 'start-record' })
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[background] onInstalled')
})

chrome.runtime.onStartup.addListener(() => {
  console.log('[background] onStartup')
})



/**
 * 从URL中提取swkdntg参数
 * @param urlStr URL字符串
 * @returns 参数值或null
 */
function extractSwkdntg(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    return url.searchParams.get('swkdntg') || null;
  } catch (err) {
    return null;
  }
}

/**
 * 处理swkdntg参数（统一逻辑）
 * @param value 参数值
 */
async function handleSwkdntg(value: string) {
  if (!value || rrwebUid === value) return
  console.log('[handleSwkdntg] 更新rrwebUid,开始:', value);
  try {
    rrwebUid = value;
    await setItem('rrwebUid', value);
    await handleStartRecording(); // 启动录制
  } catch (err) {
    console.error('[handleSwkdntg] 处理失败:', err);
  }
}

const EXCLUDED_RESOURCE_TYPES = ['stylesheet', 'script', 'image', 'font', 'media']
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method !== 'GET') return
    if (EXCLUDED_RESOURCE_TYPES.includes(details.type)) return


    const value = extractSwkdntg(details.url);
    if (value) {
      handleSwkdntg(value)
    }
  },
  { urls: ['<all_urls>'] },
  []
)

// 监听重定向（补充捕获重定向URL中的参数）
chrome.webRequest.onBeforeRedirect.addListener(
  (details) => {
    if (!details.redirectUrl) return;
    console.log('onBeforeRedirect: ', details);
    const value = extractSwkdntg(details.redirectUrl);
    if (value) {
      handleSwkdntg(value)
    }
  },
  { urls: ['<all_urls>'] },
  []
);
