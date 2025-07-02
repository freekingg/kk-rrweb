// background.ts
import { addEvent, getEventsBySession, getRecentSessions, clearAllData } from '../utils/idb'
import { setItem, getItem, generateUUID } from '../utils/helper'

console.log('[background] is running')

let sessionId: string = ''
let booleanUid = ''

let isRecording = false
let isPaused = false
let recordingStartTime: number | null = null
let pauseStartTime: number | null = null
let totalPauseTime = 0

init()

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
      handleStartRecording(sendResponse)
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

function handleStartRecording(sendResponse: (res: any) => void) {
  try {
    const now = Date.now()
    if (isPaused && pauseStartTime) {
      totalPauseTime += now - pauseStartTime
      pauseStartTime = null
      isPaused = false
    } else {
      sessionId = `recording_${now}`
      recordingStartTime = now
      totalPauseTime = 0
      isPaused = false
    }

    isRecording = true
    setItem('recording', 'start')

    broadcastToAllTabs({ type: 'start-record' })
    sendResponse({ success: true })
  } catch (err:any) {
    console.error('[background] Error starting recording:', err)
    sendResponse({ error: err.message })
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
  init()
})

chrome.runtime.onStartup.addListener(() => {
  console.log('[background] onStartup')
  init()
})
