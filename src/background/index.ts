import { addEvent, getEventsBySession, getRecentSessions, clearAllData } from '../utils/idb'
import { setItem, getItem } from '../utils/helper'
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

// 定义提取规则接口
interface ExtractRule {
  name: string;         // 规则名称
  param?: string;       // 参数名（如果是查询参数）
  pattern?: RegExp;     // 正则表达式模式（用于更复杂的匹配）
  type: 'query' | 'regex'; // 提取类型：查询参数或正则匹配
}

// 动态规则配置列表 - 可根据需求修改
const EXTRACT_RULES: ExtractRule[] = [
  // 原有swkdntg参数规则
  {
    name: 'swkdntg',
    param: 'swkdntg',
    type: 'query'
  },
  // uid=12位数字的规则
  {
    name: 'uid',
    pattern: /uid=(\d{10})/,
    type: 'regex'
  },
  // 可添加更多规则
  // 例如：提取token=32位字母数字组合
  // {
  //   name: 'token',
  //   pattern: /token=([a-zA-Z0-9]{32})/,
  //   type: 'regex'
  // }
];

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

async function updateBadge(detected: any) {
  if (detected) {
    // 显示徽章：用规则名首字母表示，设置为绿色
    chrome.action.setBadgeText({ text: `•${detected}` }).then(() => {
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }) // 绿色
    })
  } else {
    // 清除徽章
    chrome.action.setBadgeText({ text: '' })
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

  console.log('[upload] ：', payload)

  try {
    // 将事件数组压缩为 base64 格式
    const compressed = deflate(JSON.stringify(batch)) // Uint8Array

    const base64 = encodeToBase64(compressed)
    payload.compressed = base64
   

    await fetch(import.meta.env.VITE_UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    console.log('[upload] ✅ ', batch.length, '条事件')
  } catch (err) {
    console.error('[upload] ❌ :', err)
    // 可加入失败重试逻辑
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
      getItem('c').then((res) => {
        if (!res) return;
        rrwebUid = res
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
 * 根据动态规则从URL中提取参数
 * @param urlStr URL字符串
 * @returns 提取到的参数对象或null
 */
function extractParamsByRules(urlStr: string): {name: string, value: string} | null {
  try {
    // 尝试解析URL
    const url = new URL(urlStr);
    
    // 先检查查询参数类型的规则
    for (const rule of EXTRACT_RULES) {
      if (rule.type === 'query' && rule.param) {
        const value = url.searchParams.get(rule.param);
        if (value) {
          return { name: rule.name, value };
        }
      }
    }
    
    // 再检查正则表达式类型的规则
    for (const rule of EXTRACT_RULES) {
      if (rule.type === 'regex' && rule.pattern) {
        const match = urlStr.match(rule.pattern);
        if (match && match[1]) {
          return { name: rule.name, value: match[1] };
        }
      }
    }
    
    return null;
  } catch (err) {
    console.error('[extractParamsByRules] 解析URL失败:', err);
    return null;
  }
}

/**
 * 处理动态提取到的参数（统一逻辑）
 * @param param 提取到的参数对象
 */
async function handleDynamicParam(param: {name: string, value: string}) {
  try {
    // 根据不同的参数名可以有不同的处理逻辑
    switch(param.name) {
      case 'swkdntg':
      case 'uid':
        // 对于需要作为rrwebUid的参数
        if (!param.value || rrwebUid === param.value) return;
        rrwebUid = param.value;
        await setItem('rrwebUid', param.value);
        handleStartRecording(); // 启动录制
        break;
        
      // 可以添加其他参数的处理逻辑
      // case 'token':
      //   // 处理token参数的逻辑
      //   break;
    }
  } catch (err) {
    console.error(`[handleDynamicParam] 处理${param.name}失败:`, err);
  }
}

const EXCLUDED_RESOURCE_TYPES = ['stylesheet', 'script', 'image', 'font', 'media']
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method !== 'GET') return
    if (EXCLUDED_RESOURCE_TYPES.includes(details.type)) return

    const result = extractParamsByRules(details.url);
    if (result) {
      updateBadge(result.name.charAt(0)).catch(err => console.error('Badge update failed:', err));
      handleDynamicParam(result).catch(err => console.error('处理参数失败:', err));
    }
  },
  { urls: ['<all_urls>'] },
  []
)

// 监听重定向（补充捕获重定向URL中的参数）
chrome.webRequest.onBeforeRedirect.addListener(
  (details) => {
    if (!details.redirectUrl) return;
    const redirectResult = extractParamsByRules(details.redirectUrl);
    if (redirectResult) {
      updateBadge(redirectResult.name.charAt(0)).catch(err => console.error('Badge update failed:', err));
      handleDynamicParam(redirectResult).catch(err => console.error('处理参数失败:', err));
    }
  },
  { urls: ['<all_urls>'] },
  []
);
