
import { listenerHandler } from '@rrweb/types';
import { record } from 'rrweb';

let stopFn: listenerHandler | null | undefined = null;


function startRecord() {
  stopFn = record({
    emit(event) {
      sendEventToBackground(event);
    },
    sampling: {
       //@ts-ignore
      mousemove: {
        // 降低频率 & 降低距离灵敏度
        //@ts-ignore
        interval: 500,
        //@ts-ignore
        distanceThreshold: 20
      },
      input: 'last', // 只记录最后一次输入
      //@ts-ignore
      scroll: false, // 关闭 scroll
      //@ts-ignore
      media: false   // 关闭媒体事件
    },
    //@ts-ignore
    recordCanvas: false,
    //@ts-ignore
    collectFonts: false,
    //@ts-ignore
    inlineStylesheet: false // 减小初始 snapshot 大小
  });
}


function sendEventToBackground(event: any) {
  chrome.runtime.sendMessage({
    type: 'rrweb-event',
    data: event
  });
}

startRecord()