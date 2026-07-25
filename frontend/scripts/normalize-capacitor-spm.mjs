import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const packageFile = resolve("ios", "App", "CapApp-SPM", "Package.swift")
const source = await readFile(packageFile, "utf8")
const normalized = source.replaceAll("\\", "/")

if (normalized !== source) {
  await writeFile(packageFile, normalized, "utf8")
}
