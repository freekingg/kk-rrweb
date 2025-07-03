import { deflate, inflate } from 'pako'

export function compressToBase64(obj: any): string {
  const json = JSON.stringify(obj)
  const compressed = deflate(json)
  let binary = ''
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i])
  }
  return btoa(binary)
}

export function decompressFromBase64(base64: string): any {
  const binaryStr = atob(base64)
  const len = binaryStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  const json = new TextDecoder().decode(inflate(bytes))
  return JSON.parse(json)
}
