<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

// UI 状态
const isRecording = ref(false)
const recordingDuration = ref('00:00')
const isProcessing = ref(false)

// 内部计时器和时间跟踪
let displayTimer: ReturnType<typeof setInterval> | null = null
let recordingStartTime = 0 // 录制开始时间（时间戳）
let lastKnownDuration = 0 // 最后已知的持续时间（毫秒）

// 从存储中获取录制状态和开始时间
const loadRecordingState = () => {
  return new Promise<void>((resolve) => {
    chrome.storage.local.get(['isRecording', 'recordingStartTime', 'recordingDuration'], (result) => {
      isRecording.value = result.isRecording || false
      recordingStartTime = result.recordingStartTime || 0
      lastKnownDuration = result.recordingDuration || 0
      
      // 如果正在录制但没有开始时间，设置为当前时间
      if (isRecording.value && !recordingStartTime) {
        recordingStartTime = Date.now() - lastKnownDuration
        saveRecordingState()
      }
      
      // 更新显示
      updateDurationDisplay(calculateCurrentDuration())
      resolve()
    })
  })
}

// 保存录制状态到存储
const saveRecordingState = () => {
  chrome.storage.local.set({
    isRecording: isRecording.value,
    recordingStartTime: recordingStartTime,
    recordingDuration: isRecording.value ? calculateCurrentDuration() : 0
  })
}

// 从背景页获取状态并同步
const syncWithBackground = async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'get-recording-status' })
    if (res) {
      isRecording.value = res.isRecording
      if (res.isRecording) {
        // 如果背景页有开始时间，使用它
        if (res.startTime) {
          recordingStartTime = res.startTime
        } else if (!recordingStartTime) {
          // 如果没有开始时间，设置为当前时间
          recordingStartTime = Date.now() - (res.duration || 0)
        }
        lastKnownDuration = res.duration || 0
      } else {
        // 停止录制时重置
        recordingStartTime = 0
        lastKnownDuration = 0
      }
      saveRecordingState()
      updateDurationDisplay(calculateCurrentDuration())
    }
  } catch (err) {
    console.error('同步背景页状态失败', err)
  }
}

// 计算当前录制时长
const calculateCurrentDuration = (): number => {
  if (!isRecording.value) return lastKnownDuration
  
  // 如果有开始时间，使用开始时间计算
  if (recordingStartTime) {
    return Date.now() - recordingStartTime
  }
  
  // 否则使用已知时长
  return lastKnownDuration
}

// 更新时长显示 - 支持小时
const updateDurationDisplay = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  // 根据是否超过1小时决定显示格式
  if (hours > 0) {
    recordingDuration.value = `${hours.toString().padStart(2, '0')}:${
      minutes.toString().padStart(2, '0')
    }:${seconds.toString().padStart(2, '0')}`
  } else {
    recordingDuration.value = `${minutes.toString().padStart(2, '0')}:${
      seconds.toString().padStart(2, '0')
    }`
  }
}

// 启动本地计时器以更新显示
const startDisplayTimer = () => {
  if (displayTimer) {
    clearInterval(displayTimer)
  }
  
  // 立即更新一次
  updateDurationDisplay(calculateCurrentDuration())
  
  displayTimer = setInterval(() => {
    const currentDuration = calculateCurrentDuration()
    updateDurationDisplay(currentDuration)
    // 定期保存当前时长
    if (isRecording.value) {
      lastKnownDuration = currentDuration
      saveRecordingState()
    }
  }, 1000)
}

// 停止本地计时器
const stopDisplayTimer = () => {
  if (displayTimer) {
    clearInterval(displayTimer)
    displayTimer = null
  }
}

// 录制控制函数
const toggleRecording = async () => {
  try {
    isProcessing.value = true
    if (isRecording.value) {
      // 停止录制
      chrome.runtime.sendMessage({ type: 'stop-recording' })
      isRecording.value = false
      recordingStartTime = 0
      lastKnownDuration = 0
    } else {
      // 开始录制
      chrome.runtime.sendMessage({ type: 'start-recording' })
      isRecording.value = true
      // 使用背景页返回的开始时间或当前时间
      recordingStartTime = Date.now()
      lastKnownDuration = 0
    }
    saveRecordingState()
    isProcessing.value = false
  } catch (err) {
    console.error('录制控制失败', err)
    isProcessing.value = false
  }
}

// 初始化
onMounted(async () => {
  // 先从存储加载状态
  await loadRecordingState()
  // 再与背景页同步
  await syncWithBackground()
  
  // 监听录制状态变化以启动/停止计时器
  watch(isRecording, (newVal) => {
    if (newVal) {
      startDisplayTimer()
    } else {
      stopDisplayTimer()
    }
    saveRecordingState()
  })
  
  // 启动计时器
  if (isRecording.value) {
    startDisplayTimer()
  }
  
  // 每30秒与背景页同步一次
  setInterval(syncWithBackground, 30000)
})

onUnmounted(() => {
  stopDisplayTimer()
  // 卸载时保存当前状态
  if (isRecording.value) {
    lastKnownDuration = calculateCurrentDuration()
    saveRecordingState()
  }
})
</script>

<template>
  <div class="popup-container">
    <div class="header">
      <h3>rrweb 录制控制器</h3>
    </div>

    <div class="status-indicator" :class="{ recording: isRecording}">
      <div class="status-dot"></div>
      <div class="status-content">
        <div class="status-text">
          {{ isRecording ? '录制中' : '未录制' }}
        </div>
        <div class="duration" v-if="isRecording">
          {{ recordingDuration }}
        </div>
      </div>
    </div>

    <!-- <div class="footer">
      <button class="btn options-btn" @click="openOptionsPage">
        ⚙️ 设置
      </button>
    </div> -->
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

.status-content {
  text-align: left;
}

.status-text {
  font-size: 14px;
}

.duration {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  font-family: 'Courier New', monospace; /* 使用等宽字体，使时间显示更整齐 */
}

.controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 15px;
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

.stop-btn {
  background-color: #e74c3c;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background-color: #c0392b9;
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
