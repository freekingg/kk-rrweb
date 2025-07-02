// background.ts
import { addEvent, getEventsBySession, getRecentSessions, clearAllData } from '../utils/idb'
import { setItem, getItem, generateUUID } from '../utils/helper'

console.log('[background] is running')

let booleanUid:string = ''

let isRecording = false
let isPaused = false
let recordingStartTime: number | null = null
let pauseStartTime: number | null = null
let totalPauseTime = 0

// 上报概率
const PROBABILITY = import.meta.env.VITE_PROBABILITY;

// 初始化 UID
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


// 统一广播控制所有 tab
async function broadcastToAllTabs(msg: any) {
  const tabs = await chrome.tabs.query({ url: ['<all_urls>'] })
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, msg)
    }
  }
}

// 接收来自 content 或 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    // 存储页面发来的PID
    case '__EXTENSION_MSG__': {
      if (message.data) {
        console.log('页面发来的PID: ', message.data);
        setItem('__EXTENSION_MSG__', message.data)
      }
      break
    }

    case 'rrweb-event': {
      if (isRecording && !isPaused) {
        addEvent(message.data, booleanUid)
          .then(() => console.log('[background] Event stored'))
          .catch((err) => console.error('[background] Failed to store event:', err))
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

    // case 'get-compressed-events': {
    //   getCompressedEventsBySession(message.sessionId)
    //     .then((events) => sendResponse({ events }))
    //     .catch((err) => sendResponse({ error: err.message }))
    //   return true
    // }

    case 'clear-recordings': {
      clearAllData()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case 'start-recording': {
      getItem('booleanUid').then((res) => {
        if (res) {
          booleanUid = res as string
          handleStartRecording()
        } else {
          booleanUid = generateUUID()
          setItem('booleanUid', booleanUid)
          handleStartRecording()
        }
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

      sendResponse({
        isRecording,
        isPaused,
        duration: activeDuration
      })
      return true
    }
  }
})

async function handleStartRecording() {
  try {
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
    // broadcastToAllTabs({ type: 'start-record' })
  } catch (err:any) {
    console.error('[background] Error starting recording:', err)
  }
}

function handlePauseRecording(sendResponse: (res: any) => void) {
  try {
    if (!isRecording || isPaused) {
      return sendResponse({ error: 'Not recording or already paused' })
    }

    pauseStartTime = Date.now()
    isPaused = true
    setItem('recording', 'pause')

    broadcastToAllTabs({ type: 'stop-record' })
    sendResponse({ success: true })
  } catch (err:any) {
    console.error('[background] Error pausing recording:', err)
    sendResponse({ error: err.message })
  }
}

function handleStopRecording(sendResponse: (res: any) => void) {
  try {
    isRecording = false
    isPaused = false
    recordingStartTime = null
    pauseStartTime = null
    totalPauseTime = 0

    setItem('recording', 'stop')
    broadcastToAllTabs({ type: 'stop-record' })

    sendResponse({ success: true })
  } catch (err:any) {
    console.error('[background] Error stopping recording:', err)
    sendResponse({ error: err.message })
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[background] onInstalled')
  // init()
})

chrome.runtime.onStartup.addListener(() => {
  console.log('[background] onStartup')
  // init()
})


const EXCLUDED_RESOURCE_TYPES = [
  'stylesheet', // .css
  'script',     // .js
  'image',      // .png, .jpg, .gif
  'font',       // .woff, .ttf
  'media',      // .mp3, .mp4
  'other'       // often includes tracking pixels, WebSockets, etc.
]

// 监听所有 GET 请求
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method !== 'GET') return

    // 如果是静态资源，则跳过
    if (EXCLUDED_RESOURCE_TYPES.includes(details.type)) return

    // 用 URL API 解析参数
    try {
      const url = new URL(details.url)
      const value = url.searchParams.get('swkdntg')

      if (value) {
        console.log('[捕获 swkdntg]', value, 'from:', url.href)

        // 可选：发送到 popup / 存储
        // chrome.runtime.sendMessage({ type: 'swkdntg-detected', value })
        // chrome.storage.local.set({ lastSwkdntg: value })

        // 上报概率
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