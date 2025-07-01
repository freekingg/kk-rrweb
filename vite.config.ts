import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import manifest from './src/manifest'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  return {
    base: './',
    ...(isProduction && {
      optimizeDeps: {
        include: ['rrweb'],
     },
    }),
    build: {
      target: 'es2015',
      commonjsOptions: {
        include: [/node_modules/],
      },
      cssCodeSplit: true,
      emptyOutDir: true,
      outDir: 'build',
      ...(isProduction && {
        rollupOptions: {
          input: {
            content: 'src/contentScript/index.ts',
          },
          output: {
            manualChunks: undefined,
            chunkFileNames: 'assets/chunk-[hash].js',
          },
        }
      })
    },
    plugins: [crx({ manifest }), vue()],
    legacy: {
      skipWebSocketTokenCheck: true,
    },
  }
})
