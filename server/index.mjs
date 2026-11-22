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
const DATA_DIR = path.resolve(process.env.EDITOR_DATA_DIR || path.join(__dirname, 'data'))
const PORT = Number(process.env.PORT || 8787)
const JWT_SECRET = process.env.JWT_SECRET
const HOST = process.env.HOST || '127.0.0.1'
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('Укажите JWT_SECRET длиной не менее 32 символов.')
}

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
  secureCookies: process.env.SECURE_COOKIES !== 'false',
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

    const relativePath = path.relative(DIST_DIR, normalized)
    if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
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
    console.error(error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Внутренняя ошибка сервера.',
      }),
    )
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Primorye News Editor server started on http://${HOST}:${PORT}`)
})
