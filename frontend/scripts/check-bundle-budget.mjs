import {readdir, stat} from 'node:fs/promises'
import path from 'node:path'

const assetsDir = path.resolve('dist/frontend-assets')
const budgets = [
  [/bankCatalog.*\.js$/, 300 * 1024],
  [/vendor-react.*\.js$/, 245 * 1024],
  [/vendor-motion.*\.js$/, 100 * 1024],
  [/supabase.*\.js$/, 110 * 1024],
  [/FinanceScreen.*\.js$/, 110 * 1024],
  [/\.css$/, 120 * 1024],
  [/\.js$/, 310 * 1024],
]

const files = await readdir(assetsDir)
const failures = []
for (const file of files) {
  const size = (await stat(path.join(assetsDir, file))).size
  const match = budgets.find(([pattern]) => pattern.test(file))
  if (!match) continue
  const [, limit] = match
  const kib = (size / 1024).toFixed(1)
  const limitKib = (limit / 1024).toFixed(0)
  const passed = size <= limit
  process.stdout.write(`${passed ? 'OK' : 'FAIL'} ${file}: ${kib} KiB / ${limitKib} KiB\n`)
  if (!passed) failures.push({file, size, limit})
}

if (failures.length > 0) {
  throw new Error(`Bundle budget exceeded by ${failures.map(({file}) => file).join(', ')}`)
}
