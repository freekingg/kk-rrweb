import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  //@ts-ignore
  icons: {
    //@ts-ignore
    16: 'img/logo.png',
    //@ts-ignore
    32: 'img/logo.png',
    //@ts-ignore
    48: 'img/logo.png',
    //@ts-ignore
    128: 'img/logo.png',
  },
  action: {
    //@ts-ignore
    default_popup: 'popup.html',
    //@ts-ignore
    default_icon: 'img/logo.png',
  },
  //@ts-ignore
  options_page: 'options.html',
  //@ts-ignore
  background: {
    //@ts-ignore
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      //@ts-ignore
      js: ['src/contentScript/index.ts'],
      run_at: 'document_idle',
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
  web_accessible_resources: [
    {
      resources: ['img/logo.png'],
      matches: ['http://*/*', 'https://*/*'],
    },
  ],
  permissions: ['sidePanel', 'activeTab', 'storage', 'tabs', 'unlimitedStorage', 'scripting'],
  host_permissions: ['<all_urls>'],
})
