// idb.js - 使用 idb 库封装 IndexedDB 操作
import { openDB } from 'idb';
import { compressToBase64, decompressFromBase64 } from './compress'

// 数据库配置
const DB_NAME = 'rrweb_recording';
const DB_VERSION = 1;
const STORE_NAME = 'events';

// 初始化数据库
export async function initDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建事件存储对象
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'timestamp', // 使用事件时间戳作为主键
        autoIncrement: false
      });
      // 创建索引以便快速查询
      store.createIndex('sessionId', 'sessionId', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    },
  });
}

// 获取数据库实例
async function getDb() {
  return await initDb();
}

// 存储单个 rrweb 事件
export async function addEvent(event:any, sessionId = 'default') {
  const db = await getDb();
  const compressed = compressToBase64(event)
  return db.put(STORE_NAME, {
    data:compressed,
    sessionId,       // 会话 ID，用于区分不同录制
    timestamp: Date.now() // 添加时间戳
  });
}

// 获取指定会话的所有事件
export async function getEventsBySession(sessionId = 'default') {
  const db = await getDb();
  const index = db.transaction(STORE_NAME).store.index('sessionId');
  return index.getAll(sessionId);
}

// 获取最近的 N 个会话
export async function getRecentSessions(limit = 5) {
  const db = await getDb();
  const index = db.transaction(STORE_NAME).store.index('timestamp');
  
  // 获取所有唯一的 sessionId
  const allEvents = await index.getAll();
  const sessionIds = [...new Set(allEvents.map(event => event.sessionId))];
  
  // 根据最后一个事件的时间戳排序
  const sessionsWithLastEvent = sessionIds.map(sessionId => {
    const sessionEvents = allEvents.filter(e => e.sessionId === sessionId);
    const lastEvent = sessionEvents.sort((a:any, b:any) => b.timestamp - a.timestamp)[0];
    return {
      sessionId,
      startTime: sessionEvents[0].timestamp,
      endTime: lastEvent.timestamp,
      eventCount: sessionEvents.length
    };
  });
  
  // 返回最近的 N 个会话
  return sessionsWithLastEvent
    .sort((a, b) => b.endTime - a.endTime)
    .slice(0, limit);
}

// 按时间范围获取事件
export async function getEventsByTimeRange(startTime:any, endTime:any, sessionId = 'default') {
  const db = await getDb();
  const index = db.transaction(STORE_NAME).store.index('timestamp');
  const range = IDBKeyRange.bound(startTime, endTime);
  
  return index.getAll(range).then((events:any) => 
    events.filter((event:any) => event.sessionId === sessionId)
  );
}

// 删除指定会话的所有事件
export async function deleteSession(sessionId = 'default') {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('sessionId');
  
  return index.openKeyCursor(sessionId).then((cursor:any) => {
    if (!cursor) return;
    return deleteEventsInCursor(cursor);
  });
}

// 辅助函数：递归删除游标中的事件
async function deleteEventsInCursor(cursor:any) {
  await cursor.delete();
  return cursor.continue().then((nextCursor:any) => {
    if (nextCursor) return deleteEventsInCursor(nextCursor);
  });
}

// 清空所有录制数据
export async function clearAllData() {
  const db = await getDb();
  return db.clear(STORE_NAME);
}