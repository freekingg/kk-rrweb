console.log('background is running')

// background.js
import { addEvent, getEventsBySession, getRecentSessions, clearAllData } from '../utils/idb'
import { setItem, getItem, generateUUID } from '../utils/helper'

// 生成唯一会话 ID
const sessionId = `recording_${Date.now()}`

let booleanUid = ""

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'rrweb-event') {
    addEvent(message.data, booleanUid)
      .then(() => console.log('Event stored'))
      .catch((err) => console.error('Failed to store event:', err))
  }

  if (message.type === 'get-recordings') {
    getRecentSessions()
      .then((sessions) => sendResponse({ sessions }))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.type === 'get-events') {
    getEventsBySession(message.sessionId)
      .then((events) => sendResponse({ events }))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.type === 'start-recording') {
    setItem('recording', 'start')
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: any) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'start-record' })
    })
  }

  if (message.type === 'pause-recording') {
    setItem('recording', 'stop')
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: any) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stop-record' })
    })
  }

  if (message.type === 'stop-recording') {
    setItem('recording', 'stop')
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: any) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stop-record' })
    })
  }

  if (message.type === 'clear-recordings') {
    clearAllData()
      .then((events) => sendResponse({ events }))
      .catch((err) => sendResponse({ error: err.message }))
      return true
  }

  
})

function init() {
  getItem('booleanUid').then((res) => {
    if (res) {
      booleanUid = res as string;
      setItem('booleanUid', booleanUid);
    }else{
      booleanUid = generateUUID();
    }
    console.log('booleanUid: ', res);
  })
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('chrome onInstalled');
  init();


  
});

chrome.runtime.onStartup.addListener(() => {
  console.log('chrome onStartup');
  init();
});
