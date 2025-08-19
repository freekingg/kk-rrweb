<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// UI 状态
const isRecording = ref(false)
const isPaused = ref(false)
const recordingDuration = ref('00:00')
const isProcessing = ref(false)

// 轮询定时器
let pollingTimer: ReturnType<typeof setInterval> | null = null

// 获取状态并更新 UI
const fetchStatus = async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'get-recording-status' })
    console.log('res: ', res);
    isRecording.value = res.isRecording
    isPaused.value = res.isPaused

    const durationMs = res.duration ?? 0
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    recordingDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } catch (err) {
    console.error('获取录制状态失败', err)
  }
}

// 控制函数
const startRecording = async () => {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    await chrome.runtime.sendMessage({ type: 'start-recording' })
    await fetchStatus()
  } catch (err) {
    console.error('开始录制失败', err)
  } finally {
    isProcessing.value = false
  }
}

const pauseRecording = async () => {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    await chrome.runtime.sendMessage({ type: 'pause-recording' })
    await fetchStatus()
  } catch (err) {
    console.error('暂停录制失败', err)
  } finally {
    isProcessing.value = false
  }
}

const stopRecording = async () => {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    await chrome.runtime.sendMessage({ type: 'stop-recording' })
    await fetchStatus()
  } catch (err) {
    console.error('停止录制失败', err)
  } finally {
    isProcessing.value = false
  }
}

// 打开插件设置页
const openOptionsPage = () => {
  chrome.runtime.openOptionsPage()
}

// 初始化
onMounted(() => {
  fetchStatus()
  pollingTimer = setInterval(fetchStatus, 1000)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
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
      <button
        v-if="!isRecording"
        @click="startRecording"
        class="btn start-btn"
        :disabled="isProcessing"
      >
        <span class="icon">▶</span> 开始录制
      </button>

      <template v-else>
        <button
          v-if="!isPaused"
          @click="pauseRecording"
          class="btn pause-btn"
          :disabled="isProcessing"
        >
          <span class="icon">⏸</span> 暂停录制
        </button>

        <button
          v-if="isPaused"
          @click="startRecording"
          class="btn resume-btn"
          :disabled="isProcessing"
        >
          <span class="icon">▶</span> 继续录制
        </button>

        <button
          @click="stopRecording"
          class="btn stop-btn"
          :disabled="isProcessing"
        >
          <span class="icon">⏹</span> 停止录制
        </button>
      </template>
    </div>

    <div class="message" v-if="isProcessing">
      <div class="spinner"></div>
      <span>处理中...</span>
    </div>

    <div class="footer">
      <button class="btn options-btn" @click="openOptionsPage">
        ⚙️ 设置
      </button>
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

.resume-btn {
  background-color: #3498db;
  color: white;
}

.resume-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.stop-btn {
  background-color: #e74c3c;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background-color: #c0392b;
}

.options-btn {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: transparent;
  border: 1px solid #ccc;
  color: #555;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.25s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.options-btn:hover:not(:disabled) {
  border-color: #2980b9;
  color: #2980b9;
  background-color: #ecf6ff;
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

.footer {
  text-align: center;
  margin-top: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}
</style>
