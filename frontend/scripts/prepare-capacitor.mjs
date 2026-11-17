import { copyFile } from "node:fs/promises"
import { resolve } from "node:path"

const dist = resolve("dist")

await copyFile(
  resolve(dist, "mobile-offline.html"),
  resolve(dist, "index.html"),
)
