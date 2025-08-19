// vite.config.ts
import { defineConfig } from "file:///E:/code/kk-rrweb/node_modules/vite/dist/node/index.js";
import { crx } from "file:///E:/code/kk-rrweb/node_modules/@crxjs/vite-plugin/dist/index.mjs";
import vue from "file:///E:/code/kk-rrweb/node_modules/@vitejs/plugin-vue/dist/index.mjs";

// src/manifest.ts
import { defineManifest } from "file:///E:/code/kk-rrweb/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// package.json
var package_default = {
  name: "kk-rrweb",
  displayName: "kk-rrweb",
  version: "0.0.0",
  author: "**",
  description: "",
  type: "module",
  license: "MIT",
  keywords: [
    "chrome-extension",
    "vue",
    "vite",
    "create-chrome-ext"
  ],
  engines: {
    node: ">=14.18.0"
  },
  scripts: {
    dev: "vite",
    build: "vue-tsc --noEmit && vite build",
    preview: "vite preview",
    fmt: "prettier --write '**/*.{vue,ts,json,css,scss,md}'",
    zip: "npm run build && node src/zip.js"
  },
  dependencies: {
    idb: "^8.0.3",
    "lz-string": "^1.5.0",
    pako: "^2.1.0",
    rrweb: "^2.0.0-alpha.4",
    vue: "^3.3.4"
  },
  devDependencies: {
    "@crxjs/vite-plugin": "^2.0.0-beta.26",
    "@types/chrome": "^0.0.246",
    "@types/pako": "^2.0.3",
    "@vitejs/plugin-vue": "^4.4.0",
    gulp: "^5.0.0",
    "gulp-zip": "^6.0.0",
    prettier: "^3.0.3",
    typescript: "^5.2.2",
    vite: "^5.4.10",
    "vue-tsc": "2.0.29"
  }
};

// src/manifest.ts
var isDev = process.env.NODE_ENV == "development";
var manifest_default = defineManifest({
  name: `${package_default.displayName || package_default.name}${isDev ? ` \u27A1\uFE0F Dev` : ""}`,
  description: package_default.description,
  version: package_default.version,
  manifest_version: 3,
  //@ts-ignore
  icons: {
    //@ts-ignore
    16: "img/logo.png",
    //@ts-ignore
    32: "img/logo.png",
    //@ts-ignore
    48: "img/logo.png",
    //@ts-ignore
    128: "img/logo.png"
  },
  action: {
    //@ts-ignore
    default_popup: "popup.html",
    //@ts-ignore
    default_icon: "img/logo.png"
  },
  //@ts-ignore
  options_page: "options.html",
  //@ts-ignore
  background: {
    //@ts-ignore
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      //@ts-ignore
      js: ["src/contentScript/index.ts"],
      run_at: "document_idle"
    }
  ],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  web_accessible_resources: [
    {
      resources: ["img/logo.png"],
      matches: ["http://*/*", "https://*/*"]
    }
  ],
  permissions: ["activeTab", "storage", "tabs", "unlimitedStorage", "scripting", "webRequest"],
  host_permissions: ["<all_urls>"]
});

// vite.config.ts
var vite_config_default = defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  return {
    base: "./",
    ...isProduction && {
      optimizeDeps: {
        include: ["rrweb"]
      }
    },
    build: {
      target: "es2015",
      commonjsOptions: {
        include: [/node_modules/]
      },
      cssCodeSplit: true,
      emptyOutDir: true,
      outDir: "build",
      ...isProduction && {
        rollupOptions: {
          input: {
            content: "src/contentScript/index.ts"
          },
          output: {
            manualChunks: void 0,
            chunkFileNames: "assets/chunk-[hash].js"
          }
        }
      }
    },
    plugins: [crx({ manifest: manifest_default }), vue()],
    legacy: {
      skipWebSocketTokenCheck: true
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL21hbmlmZXN0LnRzIiwgInBhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXGNvZGVcXFxca2stcnJ3ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXGNvZGVcXFxca2stcnJ3ZWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L2NvZGUva2stcnJ3ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgY3J4IH0gZnJvbSAnQGNyeGpzL3ZpdGUtcGx1Z2luJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgbWFuaWZlc3QgZnJvbSAnLi9zcmMvbWFuaWZlc3QnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGlzUHJvZHVjdGlvbiA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJ1xuICByZXR1cm4ge1xuICAgIGJhc2U6ICcuLycsXG4gICAgLi4uKGlzUHJvZHVjdGlvbiAmJiB7XG4gICAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgaW5jbHVkZTogWydycndlYiddLFxuICAgICB9LFxuICAgIH0pLFxuICAgIGJ1aWxkOiB7XG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICAgIGluY2x1ZGU6IFsvbm9kZV9tb2R1bGVzL10sXG4gICAgICB9LFxuICAgICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgICBvdXREaXI6ICdidWlsZCcsXG4gICAgICAuLi4oaXNQcm9kdWN0aW9uICYmIHtcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBjb250ZW50OiAnc3JjL2NvbnRlbnRTY3JpcHQvaW5kZXgudHMnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICBtYW51YWxDaHVua3M6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2NodW5rLVtoYXNoXS5qcycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtjcngoeyBtYW5pZmVzdCB9KSwgdnVlKCldLFxuICAgIGxlZ2FjeToge1xuICAgICAgc2tpcFdlYlNvY2tldFRva2VuQ2hlY2s6IHRydWUsXG4gICAgfSxcbiAgfVxufSlcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcY29kZVxcXFxray1ycndlYlxcXFxzcmNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXGNvZGVcXFxca2stcnJ3ZWJcXFxcc3JjXFxcXG1hbmlmZXN0LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9jb2RlL2trLXJyd2ViL3NyYy9tYW5pZmVzdC50c1wiO2ltcG9ydCB7IGRlZmluZU1hbmlmZXN0IH0gZnJvbSAnQGNyeGpzL3ZpdGUtcGx1Z2luJ1xuaW1wb3J0IHBhY2thZ2VEYXRhIGZyb20gJy4uL3BhY2thZ2UuanNvbidcblxuLy9AdHMtaWdub3JlXG5jb25zdCBpc0RldiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09ICdkZXZlbG9wbWVudCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lTWFuaWZlc3Qoe1xuICBuYW1lOiBgJHtwYWNrYWdlRGF0YS5kaXNwbGF5TmFtZSB8fCBwYWNrYWdlRGF0YS5uYW1lfSR7aXNEZXYgPyBgIFx1MjdBMVx1RkUwRiBEZXZgIDogJyd9YCxcbiAgZGVzY3JpcHRpb246IHBhY2thZ2VEYXRhLmRlc2NyaXB0aW9uLFxuICB2ZXJzaW9uOiBwYWNrYWdlRGF0YS52ZXJzaW9uLFxuICBtYW5pZmVzdF92ZXJzaW9uOiAzLFxuICAvL0B0cy1pZ25vcmVcbiAgaWNvbnM6IHtcbiAgICAvL0B0cy1pZ25vcmVcbiAgICAxNjogJ2ltZy9sb2dvLnBuZycsXG4gICAgLy9AdHMtaWdub3JlXG4gICAgMzI6ICdpbWcvbG9nby5wbmcnLFxuICAgIC8vQHRzLWlnbm9yZVxuICAgIDQ4OiAnaW1nL2xvZ28ucG5nJyxcbiAgICAvL0B0cy1pZ25vcmVcbiAgICAxMjg6ICdpbWcvbG9nby5wbmcnLFxuICB9LFxuICBhY3Rpb246IHtcbiAgICAvL0B0cy1pZ25vcmVcbiAgICBkZWZhdWx0X3BvcHVwOiAncG9wdXAuaHRtbCcsXG4gICAgLy9AdHMtaWdub3JlXG4gICAgZGVmYXVsdF9pY29uOiAnaW1nL2xvZ28ucG5nJyxcbiAgfSxcbiAgLy9AdHMtaWdub3JlXG4gIG9wdGlvbnNfcGFnZTogJ29wdGlvbnMuaHRtbCcsXG4gIC8vQHRzLWlnbm9yZVxuICBiYWNrZ3JvdW5kOiB7XG4gICAgLy9AdHMtaWdub3JlXG4gICAgc2VydmljZV93b3JrZXI6ICdzcmMvYmFja2dyb3VuZC9pbmRleC50cycsXG4gICAgdHlwZTogJ21vZHVsZScsXG4gIH0sXG4gIGNvbnRlbnRfc2NyaXB0czogW1xuICAgIHtcbiAgICAgIG1hdGNoZXM6IFsnPGFsbF91cmxzPiddLFxuICAgICAgLy9AdHMtaWdub3JlXG4gICAgICBqczogWydzcmMvY29udGVudFNjcmlwdC9pbmRleC50cyddLFxuICAgICAgcnVuX2F0OiAnZG9jdW1lbnRfaWRsZScsXG4gICAgfSxcbiAgXSxcbiAgY29udGVudF9zZWN1cml0eV9wb2xpY3k6IHtcbiAgICBleHRlbnNpb25fcGFnZXM6IFwic2NyaXB0LXNyYyAnc2VsZicgJ3dhc20tdW5zYWZlLWV2YWwnOyBvYmplY3Qtc3JjICdzZWxmJ1wiLFxuICB9LFxuICB3ZWJfYWNjZXNzaWJsZV9yZXNvdXJjZXM6IFtcbiAgICB7XG4gICAgICByZXNvdXJjZXM6IFsnaW1nL2xvZ28ucG5nJ10sXG4gICAgICBtYXRjaGVzOiBbJ2h0dHA6Ly8qLyonLCAnaHR0cHM6Ly8qLyonXSxcbiAgICB9LFxuICBdLFxuICBwZXJtaXNzaW9uczogWydhY3RpdmVUYWInLCAnc3RvcmFnZScsICd0YWJzJywgJ3VubGltaXRlZFN0b3JhZ2UnLCAnc2NyaXB0aW5nJywnd2ViUmVxdWVzdCddLFxuICBob3N0X3Blcm1pc3Npb25zOiBbJzxhbGxfdXJscz4nXSxcbn0pXG4iLCAie1xuICBcIm5hbWVcIjogXCJray1ycndlYlwiLFxuICBcImRpc3BsYXlOYW1lXCI6IFwia2stcnJ3ZWJcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjBcIixcbiAgXCJhdXRob3JcIjogXCIqKlwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiXCIsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgXCJjaHJvbWUtZXh0ZW5zaW9uXCIsXG4gICAgXCJ2dWVcIixcbiAgICBcInZpdGVcIixcbiAgICBcImNyZWF0ZS1jaHJvbWUtZXh0XCJcbiAgXSxcbiAgXCJlbmdpbmVzXCI6IHtcbiAgICBcIm5vZGVcIjogXCI+PTE0LjE4LjBcIlxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiZGV2XCI6IFwidml0ZVwiLFxuICAgIFwiYnVpbGRcIjogXCJ2dWUtdHNjIC0tbm9FbWl0ICYmIHZpdGUgYnVpbGRcIixcbiAgICBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIixcbiAgICBcImZtdFwiOiBcInByZXR0aWVyIC0td3JpdGUgJyoqLyoue3Z1ZSx0cyxqc29uLGNzcyxzY3NzLG1kfSdcIixcbiAgICBcInppcFwiOiBcIm5wbSBydW4gYnVpbGQgJiYgbm9kZSBzcmMvemlwLmpzXCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiaWRiXCI6IFwiXjguMC4zXCIsXG4gICAgXCJsei1zdHJpbmdcIjogXCJeMS41LjBcIixcbiAgICBcInBha29cIjogXCJeMi4xLjBcIixcbiAgICBcInJyd2ViXCI6IFwiXjIuMC4wLWFscGhhLjRcIixcbiAgICBcInZ1ZVwiOiBcIl4zLjMuNFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBjcnhqcy92aXRlLXBsdWdpblwiOiBcIl4yLjAuMC1iZXRhLjI2XCIsXG4gICAgXCJAdHlwZXMvY2hyb21lXCI6IFwiXjAuMC4yNDZcIixcbiAgICBcIkB0eXBlcy9wYWtvXCI6IFwiXjIuMC4zXCIsXG4gICAgXCJAdml0ZWpzL3BsdWdpbi12dWVcIjogXCJeNC40LjBcIixcbiAgICBcImd1bHBcIjogXCJeNS4wLjBcIixcbiAgICBcImd1bHAtemlwXCI6IFwiXjYuMC4wXCIsXG4gICAgXCJwcmV0dGllclwiOiBcIl4zLjAuM1wiLFxuICAgIFwidHlwZXNjcmlwdFwiOiBcIl41LjIuMlwiLFxuICAgIFwidml0ZVwiOiBcIl41LjQuMTBcIixcbiAgICBcInZ1ZS10c2NcIjogXCIyLjAuMjlcIlxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdPLFNBQVMsb0JBQW9CO0FBQ3JRLFNBQVMsV0FBVztBQUNwQixPQUFPLFNBQVM7OztBQ0ZnTyxTQUFTLHNCQUFzQjs7O0FDQS9RO0FBQUEsRUFDRSxNQUFRO0FBQUEsRUFDUixhQUFlO0FBQUEsRUFDZixTQUFXO0FBQUEsRUFDWCxRQUFVO0FBQUEsRUFDVixhQUFlO0FBQUEsRUFDZixNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxVQUFZO0FBQUEsSUFDVjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFD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
