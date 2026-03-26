import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiHandler } from './api.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const DATA_DIR = path.join(__dirname, 'data')
const PORT = Number(process.env.PORT || 8787)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

const apiHandler = createApiHandler({
  dataDir: DATA_DIR,
  jwtSecret: JWT_SECRET,
})

const sendFile = async (res, filePath) => {
  const stat = await fs.stat(filePath)
  const ext = path.extname(filePath).toLowerCase()
  res.statusCode = 200
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
  res.setHeader('Content-Length', String(stat.size))
  if (ext !== '.html') {
    res.setHeader('Cache-Control', 'public, max-age=604800')
  }

  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('end', resolve)
    stream.pipe(res)
  })
}

const server = http.createServer(async (req, res) => {
  try {
    const handledApi = await apiHandler(req, res)
    if (handledApi) {
      return
    }

    const requestUrl = new URL(req.url || '/', 'http://localhost')
    const pathname = decodeURIComponent(requestUrl.pathname)
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname.slice(1))
    const normalized = path.normalize(filePath)

    if (!normalized.startsWith(DIST_DIR)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    try {
      const stat = await fs.stat(normalized)
      if (stat.isDirectory()) {
        filePath = path.join(normalized, 'index.html')
      } else {
        filePath = normalized
      }
      await sendFile(res, filePath)
      return
    } catch {
      await sendFile(res, path.join(DIST_DIR, 'index.html'))
    }
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    )
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Primorye News Editor server started on http://0.0.0.0:${PORT}`)
})
