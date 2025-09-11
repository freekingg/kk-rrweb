// vite.config.ts
import { defineConfig } from "file:///E:/code/kk-rrweb/node_modules/vite/dist/node/index.js";
import { crx } from "file:///E:/code/kk-rrweb/node_modules/@crxjs/vite-plugin/dist/index.mjs";
import vue from "file:///E:/code/kk-rrweb/node_modules/@vitejs/plugin-vue/dist/index.mjs";

// src/manifest.ts
import { defineManifest } from "file:///E:/code/kk-rrweb/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// package.json
var package_default = {
  name: "boolean-monitor",
  displayName: "Boolean-Monitor",
  version: "2.1.6",
  author: "**",
  description: "",
  type: "module",
  license: "MIT",
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
      run_at: "document_end"
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL21hbmlmZXN0LnRzIiwgInBhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXGNvZGVcXFxca2stcnJ3ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXGNvZGVcXFxca2stcnJ3ZWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L2NvZGUva2stcnJ3ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgY3J4IH0gZnJvbSAnQGNyeGpzL3ZpdGUtcGx1Z2luJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgbWFuaWZlc3QgZnJvbSAnLi9zcmMvbWFuaWZlc3QnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGlzUHJvZHVjdGlvbiA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJ1xuICByZXR1cm4ge1xuICAgIGJhc2U6ICcuLycsXG4gICAgLi4uKGlzUHJvZHVjdGlvbiAmJiB7XG4gICAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgaW5jbHVkZTogWydycndlYiddLFxuICAgICB9LFxuICAgIH0pLFxuICAgIGJ1aWxkOiB7XG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICAgIGluY2x1ZGU6IFsvbm9kZV9tb2R1bGVzL10sXG4gICAgICB9LFxuICAgICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgICBvdXREaXI6ICdidWlsZCcsXG4gICAgICAuLi4oaXNQcm9kdWN0aW9uICYmIHtcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBjb250ZW50OiAnc3JjL2NvbnRlbnRTY3JpcHQvaW5kZXgudHMnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICBtYW51YWxDaHVua3M6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2NodW5rLVtoYXNoXS5qcycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtjcngoeyBtYW5pZmVzdCB9KSwgdnVlKCldLFxuICAgIGxlZ2FjeToge1xuICAgICAgc2tpcFdlYlNvY2tldFRva2VuQ2hlY2s6IHRydWUsXG4gICAgfSxcbiAgfVxufSlcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcY29kZVxcXFxray1ycndlYlxcXFxzcmNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXGNvZGVcXFxca2stcnJ3ZWJcXFxcc3JjXFxcXG1hbmlmZXN0LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9jb2RlL2trLXJyd2ViL3NyYy9tYW5pZmVzdC50c1wiO2ltcG9ydCB7IGRlZmluZU1hbmlmZXN0IH0gZnJvbSAnQGNyeGpzL3ZpdGUtcGx1Z2luJ1xuaW1wb3J0IHBhY2thZ2VEYXRhIGZyb20gJy4uL3BhY2thZ2UuanNvbidcblxuLy9AdHMtaWdub3JlXG5jb25zdCBpc0RldiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09ICdkZXZlbG9wbWVudCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lTWFuaWZlc3Qoe1xuICBuYW1lOiBgJHtwYWNrYWdlRGF0YS5kaXNwbGF5TmFtZSB8fCBwYWNrYWdlRGF0YS5uYW1lfSR7aXNEZXYgPyBgIFx1MjdBMVx1RkUwRiBEZXZgIDogJyd9YCxcbiAgZGVzY3JpcHRpb246IHBhY2thZ2VEYXRhLmRlc2NyaXB0aW9uLFxuICB2ZXJzaW9uOiBwYWNrYWdlRGF0YS52ZXJzaW9uLFxuICBtYW5pZmVzdF92ZXJzaW9uOiAzLFxuICAvL0B0cy1pZ25vcmVcbiAgaWNvbnM6IHtcbiAgICAvL0B0cy1pZ25vcmVcbiAgICAxNjogJ2ltZy9sb2dvLnBuZycsXG4gICAgLy9AdHMtaWdub3JlXG4gICAgMzI6ICdpbWcvbG9nby5wbmcnLFxuICAgIC8vQHRzLWlnbm9yZVxuICAgIDQ4OiAnaW1nL2xvZ28ucG5nJyxcbiAgICAvL0B0cy1pZ25vcmVcbiAgICAxMjg6ICdpbWcvbG9nby5wbmcnLFxuICB9LFxuICBhY3Rpb246IHtcbiAgICAvL0B0cy1pZ25vcmVcbiAgICBkZWZhdWx0X3BvcHVwOiAncG9wdXAuaHRtbCcsXG4gICAgLy9AdHMtaWdub3JlXG4gICAgZGVmYXVsdF9pY29uOiAnaW1nL2xvZ28ucG5nJyxcbiAgfSxcbiAgLy9AdHMtaWdub3JlXG4gIG9wdGlvbnNfcGFnZTogJ29wdGlvbnMuaHRtbCcsXG4gIC8vQHRzLWlnbm9yZVxuICBiYWNrZ3JvdW5kOiB7XG4gICAgLy9AdHMtaWdub3JlXG4gICAgc2VydmljZV93b3JrZXI6ICdzcmMvYmFja2dyb3VuZC9pbmRleC50cycsXG4gICAgdHlwZTogJ21vZHVsZScsXG4gIH0sXG4gIGNvbnRlbnRfc2NyaXB0czogW1xuICAgIHtcbiAgICAgIG1hdGNoZXM6IFsnPGFsbF91cmxzPiddLFxuICAgICAgLy9AdHMtaWdub3JlXG4gICAgICBqczogWydzcmMvY29udGVudFNjcmlwdC9pbmRleC50cyddLFxuICAgICAgcnVuX2F0OiAnZG9jdW1lbnRfZW5kJyxcbiAgICB9LFxuICBdLFxuICBjb250ZW50X3NlY3VyaXR5X3BvbGljeToge1xuICAgIGV4dGVuc2lvbl9wYWdlczogXCJzY3JpcHQtc3JjICdzZWxmJyAnd2FzbS11bnNhZmUtZXZhbCc7IG9iamVjdC1zcmMgJ3NlbGYnXCIsXG4gIH0sXG4gIHdlYl9hY2Nlc3NpYmxlX3Jlc291cmNlczogW1xuICAgIHtcbiAgICAgIHJlc291cmNlczogWydpbWcvbG9nby5wbmcnXSxcbiAgICAgIG1hdGNoZXM6IFsnaHR0cDovLyovKicsICdodHRwczovLyovKiddLFxuICAgIH0sXG4gIF0sXG4gIHBlcm1pc3Npb25zOiBbJ2FjdGl2ZVRhYicsICdzdG9yYWdlJywgJ3RhYnMnLCAndW5saW1pdGVkU3RvcmFnZScsICdzY3JpcHRpbmcnLCd3ZWJSZXF1ZXN0J10sXG4gIGhvc3RfcGVybWlzc2lvbnM6IFsnPGFsbF91cmxzPiddLFxufSlcbiIsICJ7XG4gIFwibmFtZVwiOiBcImJvb2xlYW4tbW9uaXRvclwiLFxuICBcImRpc3BsYXlOYW1lXCI6IFwiQm9vbGVhbi1Nb25pdG9yXCIsXG4gIFwidmVyc2lvblwiOiBcIjIuMS42XCIsXG4gIFwiYXV0aG9yXCI6IFwiKipcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcInR5cGVcIjogXCJtb2R1bGVcIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwiZW5naW5lc1wiOiB7XG4gICAgXCJub2RlXCI6IFwiPj0xNC4xOC4wXCJcbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImRldlwiOiBcInZpdGVcIixcbiAgICBcImJ1aWxkXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmJiB2aXRlIGJ1aWxkXCIsXG4gICAgXCJwcmV2aWV3XCI6IFwidml0ZSBwcmV2aWV3XCIsXG4gICAgXCJmbXRcIjogXCJwcmV0dGllciAtLXdyaXRlICcqKi8qLnt2dWUsdHMsanNvbixjc3Msc2NzcyxtZH0nXCIsXG4gICAgXCJ6aXBcIjogXCJucG0gcnVuIGJ1aWxkICYmIG5vZGUgc3JjL3ppcC5qc1wiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImlkYlwiOiBcIl44LjAuM1wiLFxuICAgIFwibHotc3RyaW5nXCI6IFwiXjEuNS4wXCIsXG4gICAgXCJwYWtvXCI6IFwiXjIuMS4wXCIsXG4gICAgXCJycndlYlwiOiBcIl4yLjAuMC1hbHBoYS40XCIsXG4gICAgXCJ2dWVcIjogXCJeMy4zLjRcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAY3J4anMvdml0ZS1wbHVnaW5cIjogXCJeMi4wLjAtYmV0YS4yNlwiLFxuICAgIFwiQHR5cGVzL2Nocm9tZVwiOiBcIl4wLjAuMjQ2XCIsXG4gICAgXCJAdHlwZXMvcGFrb1wiOiBcIl4yLjAuM1wiLFxuICAgIFwiQHZpdGVqcy9wbHVnaW4tdnVlXCI6IFwiXjQuNC4wXCIsXG4gICAgXCJndWxwXCI6IFwiXjUuMC4wXCIsXG4gICAgXCJndWxwLXppcFwiOiBcIl42LjAuMFwiLFxuICAgIFwicHJldHRpZXJcIjogXCJeMy4wLjNcIixcbiAgICBcInR5cGVzY3JpcHRcIjogXCJeNS4yLjJcIixcbiAgICBcInZpdGVcIjogXCJeNS40LjEwXCIsXG4gICAgXCJ2dWUtdHNjXCI6IFwiMi4wLjI5XCJcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3TyxTQUFTLG9CQUFvQjtBQUNyUSxTQUFTLFdBQVc7QUFDcEIsT0FBTyxTQUFTOzs7QUNGZ08sU0FBUyxzQkFBc0I7OztBQ0EvUTtBQUFBLEVBQ0UsTUFBUTtBQUFBLEVBQ1IsYUFBZTtBQUFBLEVBQ2YsU0FBVztBQUFBLEVBQ1gsUUFBVTtBQUFBLEVBQ1YsYUFBZTtBQUFBLEVBQ2YsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsU0FBVztBQUFBLElBQ1QsTUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULEtBQU87QUFBQSxJQUNQLE9BQVM7QUFBQSxJQUNULFNBQVc7QUFBQSxJQUNYLEtBQU87QUFBQSxJQUNQLEtBQU87QUFBQSxFQUNUO0FBQUEsRUFD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
