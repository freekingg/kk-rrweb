<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { setItem, getItem } from '../utils/helper'

// 录制状态
const isRecording = ref(false)
const recordingStartTime = ref<number | null>(null)
const recordingDuration = ref('00:00')
const isPaused = ref(false)
const pauseStartTime = ref<number | null>(null)
const totalPauseTime = ref(0)
const isProcessing = ref(false)

// 更新录制时长显示
const updateDuration = () => {
  if (!recordingStartTime.value) return

  const now = Date.now()
  const pauseTime = totalPauseTime.value

  // 计算实际录制时间（排除暂停时间）
  const durationMs = isPaused.value
    ? pauseStartTime.value! - recordingStartTime.value - pauseTime
    : now - recordingStartTime.value - pauseTime

  // 格式化为 MM:SS
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.floor((durationMs % 60000) / 1000)
  recordingDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 开始录制
const startRecording = async () => {
  if (isProcessing.value) return

  try {
    isProcessing.value = true

    // 如果是恢复录制而非全新开始
    if (isPaused.value) {
      // 计算暂停时长并累加
      const pauseDuration = Date.now() - pauseStartTime.value!
      totalPauseTime.value += pauseDuration
      isPaused.value = false
    } else {
      // 全新开始录制
      recordingStartTime.value = Date.now()
      totalPauseTime.value = 0

      // 发送消息到 background 开始录制
      await chrome.runtime.sendMessage({ type: 'start-recording' })
    }

    isRecording.value = true
    startDurationTimer()
  } catch (err) {
    console.error('开始录制失败:', err)
    // 显示错误提示
  } finally {
    isProcessing.value = false
  }
}

// 暂停录制
const pauseRecording = async () => {
  if (!isRecording.value || isPaused.value || isProcessing.value) return

  try {
    isProcessing.value = true
    isPaused.value = true
    pauseStartTime.value = Date.now()

    // 发送消息到 background 暂停录制
    await chrome.runtime.sendMessage({ type: 'pause-recording' })
  } catch (err) {
    console.error('暂停录制失败:', err)
    // 显示错误提示
  } finally {
    isProcessing.value = false
  }
}

// 停止录制
const stopRecording = async () => {
  if (!isRecording.value || isProcessing.value) return

  try {
    isProcessing.value = true

    // 发送消息到 background 停止录制
    await chrome.runtime.sendMessage({ type: 'stop-recording' })

    // 重置状态
    resetRecordingState()
  } catch (err) {
    console.error('停止录制失败:', err)
    // 显示错误提示
  } finally {
    isProcessing.value = false
  }
}

// 重置录制状态
const resetRecordingState = () => {
  isRecording.value = false
  isPaused.value = false
  recordingStartTime.value = null
  pauseStartTime.value = null
  totalPauseTime.value = 0
  recordingDuration.value = '00:00'

  // 停止计时器
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}

// 时长计时器
let durationTimer: ReturnType<typeof setInterval> | null = null

const startDurationTimer = () => {
  // 先清除现有计时器
  if (durationTimer) {
    clearInterval(durationTimer)
  }

  // 每秒更新一次时长显示
  durationTimer = setInterval(updateDuration, 1000)
}

// 监听录制状态变化，更新UI
watch(isRecording, (newVal) => {
  if (!newVal) {
    resetRecordingState()
  }
})

// 组件卸载时清理
onMounted(() => {
  chrome.storage.local.get('recording', (res) => {
    if (!res.recording || res.recording === 'start') {
      isRecording.value = true
    } else {
      isRecording.value = false
    }
  })
})

// 页面卸载时清理
onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
  }
})
</script>

<template>
  <div class="popup-container">
    <div class="header">
      <h3>rrweb 录制控制器</h3>
    </div>

    <div class="status-indicator" :class="{ recording: isRecording, paused: isPaused }">
      <div class="status-dot"></div>
      <div class="status-text">
        {{ isRecording ? (isPaused ? '已暂停' : '录制中') : '未录制' }}
      </div>
      <div class="duration">{{ recordingDuration }}</div>
    </div>

    <div class="controls">
      <button @click="startRecording" class="btn start-btn" :disabled="isRecording || isProcessing">
        <span class="icon">▶</span> 开始录制
      </button>

      <button
        @click="pauseRecording"
        class="btn pause-btn"
        :disabled="!isRecording || isPaused || isProcessing"
      >
        <span class="icon">⏸</span> 暂停录制
      </button>

      <button @click="stopRecording" class="btn stop-btn" :disabled="!isRecording || isProcessing">
        <span class="icon">⏹</span> 停止录制
      </button>
    </div>

    <div class="message" v-if="isProcessing">
      <div class="spinner"></div>
      <span>处理中...</span>
    </div>
  </div>
</template>

<style scoped>
.popup-container {
  width: 300px;
  padding: 15px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

h3 {
  font-size: 16px;
  color: #333;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  padding: 10px;
  border-radius: 4px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
}

.recording .status-dot {
  background-color: #e74c3c;
  animation: pulse 1.5s infinite;
}

.paused .status-dot {
  background-color: #f39c12;
}

.status-text {
  font-size: 14px;
  margin-right: 10px;
}

.duration {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.btn {
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.start-btn {
  background-color: #27ae60;
  color: white;
}

.start-btn:hover:not(:disabled) {
  background-color: #2ecc71;
}

.pause-btn {
  background-color: #f39c12;
  color: white;
}

.pause-btn:hover:not(:disabled) {
  background-color: #f1c40f;
}

.stop-btn {
  background-color: #e74c3c;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background-color: #c0392b;
}

.icon {
  margin-right: 5px;
}

.message {
  text-align: center;
  margin-top: 15px;
  color: #777;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 5px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}
</style>
