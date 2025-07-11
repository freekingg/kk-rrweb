// background.ts
import { addEvent, getEventsBySession, getRecentSessions, clearAllData } from '../utils/idb'
import { setItem, getItem, generateUUID } from '../utils/helper'
import { deflate } from 'pako'

console.log('[background] is running')

let booleanUid: string = ''
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

  const payload = {
      sessionId: booleanUid,
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


function init() {
  getItem('booleanUid').then((res) => {
    if (res) {
      booleanUid = res as string
    } else {
      booleanUid = generateUUID()
      setItem('booleanUid', booleanUid)
    }
    console.log('[background] booleanUid:', booleanUid)
  })
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
  switch (message.type) {
    case '__EXTENSION_MSG__': {
      if (message.data) {
        setItem('__EXTENSION_MSG__', message.data)
      }
      break
    }

    case 'rrweb-event': {
      if (isRecording && !isPaused) {
        const event = message.data
        bufferEvent(event)
        // addEvent(message.data, booleanUid).catch((err) => console.error('[background] Failed to store event:', err))
      }
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
      getItem('booleanUid').then((res) => {
        booleanUid = res ? res as string : generateUUID()
        setItem('booleanUid', booleanUid)
        handleStartRecording()
      })
      return true
    }

    case 'pause-recording': {
      handlePauseRecording(sendResponse)
      return true
    }

    case 'stop-recording': {
      handleStopRecording(sendResponse)
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
  if (isPaused && pauseStartTime) {
    totalPauseTime += now - pauseStartTime
    pauseStartTime = null
    isPaused = false
  } else {
    recordingStartTime = now
    totalPauseTime = 0
    isPaused = false
  }
  isRecording = true
  await setItem('recording', 'start')
  broadcastToActiveTab({ type: 'start-record' })
}

function handlePauseRecording(sendResponse: (res: any) => void) {
  if (!isRecording || isPaused) return sendResponse({ error: 'Not recording or already paused' })
  pauseStartTime = Date.now()
  isPaused = true
  setItem('recording', 'pause')
  broadcastToAllTabs({ type: 'stop-record' })
  sendResponse({ success: true })
}

function handleStopRecording(sendResponse: (res: any) => void) {
  isRecording = false
  isPaused = false
  recordingStartTime = null
  pauseStartTime = null
  totalPauseTime = 0
  setItem('recording', 'stop')
  broadcastToAllTabs({ type: 'stop-record' })
  sendResponse({ success: true })
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[background] onInstalled')
})

chrome.runtime.onStartup.addListener(() => {
  console.log('[background] onStartup')
})

const EXCLUDED_RESOURCE_TYPES = ['stylesheet', 'script', 'image', 'font', 'media', 'other']

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method !== 'GET') return
    if (EXCLUDED_RESOURCE_TYPES.includes(details.type)) return

    try {
      const url = new URL(details.url)
      const value = url.searchParams.get('swkdntg')
      if (value) {
        const random = Math.random()
        if (random < PROBABILITY) {
          setItem('booleanUid', value).then(() => {
            booleanUid = value
            handleStartRecording()
          })
        }
      }
    } catch (e) {
      console.warn('URL 解析失败：', details.url)
    }
  },
  { urls: ['<all_urls>'] },
  []
)
