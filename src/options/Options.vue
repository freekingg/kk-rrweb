<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface RecordingSession {
  sessionId: string;
  startTime: number;
  endTime: number;
  eventCount: number;
}

const recordings = ref<RecordingSession[]>([])
const loading = ref(false)
const selectedSession = ref<string | null>(null)
const eventDataMap = ref<Record<string, any[]>>({})
const errorMessage = ref('')
const isCopying = ref(false)
const copySuccessMap = ref<Record<string, boolean>>({})

const fetchRecordings = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-recordings' })
    console.log('response: ', response);
    if (response.error) {
      errorMessage.value = `获取录制失败: ${response.error}`
      recordings.value = []
    } else {
      recordings.value = response.sessions || []
    }
  } catch (err) {
    errorMessage.value = `获取录制失败: ${(err as Error).message}`
    recordings.value = []
  } finally {
    loading.value = false
  }
}

const fetchEvents = async (sessionId: string) => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get-events',
      sessionId
    })
    if (response.error) {
      errorMessage.value = `加载事件失败: ${response.error}`
      return
    }
    if (!response.events || response.events.length === 0) {
      errorMessage.value = '无可用事件数据'
      return
    }
    eventDataMap.value[sessionId] = response.events
    selectedSession.value = sessionId
  } catch (err) {
    errorMessage.value = `获取事件失败: ${(err as Error).message}`
  } finally {
    loading.value = false
  }
}

const clearRecordings = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await chrome.runtime.sendMessage({ type: 'clear-recordings' })
    if (response.error) {
      errorMessage.value = `清除失败: ${response.error}`
    } else {
      recordings.value = []
      selectedSession.value = null
      eventDataMap.value = {}
    }
  } catch (err) {
    errorMessage.value = `清除失败: ${(err as Error).message}`
  } finally {
    loading.value = false
  }
}

const copyEventsToClipboard = async (sessionId: string) => {
  await fetchEvents(sessionId)
  const data = eventDataMap.value[sessionId]
  if (!data) return

  try {
    isCopying.value = true
    copySuccessMap.value[sessionId] = false
    const jsonString = JSON.stringify(data, null, 2)
    await navigator.clipboard.writeText(jsonString)
    copySuccessMap.value[sessionId] = true
    setTimeout(() => (copySuccessMap.value[sessionId] = false), 2000)
  } catch (err) {
    errorMessage.value = `复制失败: ${(err as Error).message}`
  } finally {
    isCopying.value = false
  }
}

const downloadEvents = async (sessionId: string) => {
  await fetchEvents(sessionId)
  const data = eventDataMap.value[sessionId]
  if (!data) return

  try {
    const jsonString = JSON.stringify(data)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rrweb-events-${sessionId}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    errorMessage.value = `下载失败: ${(err as Error).message}`
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const formatFileSize = (data: any[]) => {
  if (!data || data.length === 0) return '0 B'
  const bytes = new TextEncoder().encode(JSON.stringify(data)).length
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

onMounted(() => {
  fetchRecordings()
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'recording-updated') {
      fetchRecordings()
    }
  })
})
</script>

<template>
  <main class="options-main">
    <h3 class="options-title">🎥 事件数据管理</h3>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div class="controls">
      <div class="button-group">
        <button @click="fetchRecordings" :disabled="loading" class="btn">
          {{ loading ? '加载中...' : '刷新录制' }}
        </button>
        <button @click="clearRecordings" :disabled="loading" class="btn btn-danger">
          清除缓存
        </button>
      </div>
      <span v-if="recordings.length > 0" class="recording-count">
        共 {{ recordings.length }} 个录制
      </span>
    </div>

    <div class="recordings-list">
      <div
        v-for="session in recordings"
        :key="session.sessionId"
        class="recording-item"
        :class="{ selected: selectedSession === session.sessionId }"
        @click="fetchEvents(session.sessionId)"
      >
        <div class="recording-main">
          <div>
            <div class="recording-id">{{ session.sessionId }}</div>
            <div class="recording-meta">
              <div>开始: {{ formatDate(session.startTime) }}</div>
              <div>结束: {{ formatDate(session.endTime) }}</div>
              <div>事件数: {{ session.eventCount }}</div>
            </div>
          </div>

          <div  class="recording-actions">
            <div class="stat">📊 {{ eventDataMap[session.sessionId]?.length }} 条</div>
            <div class="stat">💾 {{ formatFileSize(eventDataMap[session.sessionId]) }}</div>
            <button class="btn" @click.stop="copyEventsToClipboard(session.sessionId)">
              {{ copySuccessMap[session.sessionId] ? '✅ 已复制' : '复制 JSON' }}
            </button>
            <button class="btn" @click.stop="downloadEvents(session.sessionId)">下载 JSON</button>
          </div>
        </div>
      </div>

      <div v-if="!loading && recordings.length === 0" class="empty-state">
        暂无录制数据
      </div>
    </div>
  </main>
</template>

<style scoped>
:root {
  --primary: #1a73e8;
  --primary-bg: #e8f0fe;
  --danger: #d93025;
  --danger-bg: #fdecea;
  --border: #dcdfe6;
  --text: #333;
  --muted: #888;
  --bg: #fff;
}

body {
  background-color: #f5f6f8;
  margin: 0;
  padding: 0;
}

.options-main {
  max-width: 900px;
  margin: auto;
  padding: 20px;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.options-title {
  font-size: 20px;
  margin-bottom: 20px;
  color: var(--text);
}

.error-message {
  background: #ffecec;
  color: var(--danger);
  padding: 10px;
  border-left: 4px solid var(--danger);
  margin-bottom: 20px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.button-group {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid var(--primary);
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: 0.2s ease;
}

.btn:hover {
  background: #d2e3fc;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: var(--danger-bg);
  border-color: var(--danger);
  color: var(--danger);
}

.recording-count {
  font-size: 14px;
  color: var(--muted);
}

.recordings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recording-item {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #f9f9f9;
  padding: 12px;
  cursor: pointer;
}

.recording-item:hover {
  background: #f0f4ff;
}

.selected {
  border-color: var(--primary);
  background: #e6f0fe;
}

.recording-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.recording-id {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 5px;
}

.recording-meta {
  font-size: 13px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recording-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  font-size: 13px;
  text-align: right;
}

.stat {
  color: var(--muted);
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: var(--muted);
  font-size: 14px;
}
</style>
