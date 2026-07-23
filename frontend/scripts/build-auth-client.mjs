import { build } from "vite"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))

await build({
  root,
  configFile: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("../src/auth/authPage.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "auth-client.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
    minify: "esbuild",
  },
})
