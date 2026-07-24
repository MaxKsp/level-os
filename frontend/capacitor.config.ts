import type { CapacitorConfig } from "@capacitor/cli"

const appUrl = process.env.LEVELOS_MOBILE_APP_URL?.trim() || "https://lvlos.com"

const config: CapacitorConfig = {
  appId: "com.lvlos.app",
  appName: "Level OS",
  webDir: "dist",
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: ["lvlos.com", "www.lvlos.com"],
    errorPath: "mobile-offline.html",
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
