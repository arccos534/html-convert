import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Vite config consumes the runtime .mjs helper directly.
import { createApiHandler } from './server/api.mjs'

const scriptPath = path.resolve(__dirname, 'scripts', 'export-excel-visual.ps1')
const apiHandler = createApiHandler({
  dataDir: path.resolve(__dirname, '.local-server-data'),
  jwtSecret: process.env.JWT_SECRET || 'local-dev-secret',
})

const readJsonBody = async (request: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
    filename?: string
    base64?: string
  }
}

const sendJson = (response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (chunk: string) => void }, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

const runExcelExport = async (inputPath: string, outputPath: string) =>
  new Promise<void>((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-InputPath', inputPath, '-OutputPath', outputPath],
      {
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
      },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message))
          return
        }

        resolve()
      },
    )
  })

const excelVisualImportMiddleware = async (
  req: { method?: string; url?: string },
  res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (chunk: string) => void },
) => {
  if (req.method !== 'POST' || req.url !== '/__local/excel-visual-import') {
    return false
  }

  let tempDir = ''

  try {
    const body = await readJsonBody(req as unknown as NodeJS.ReadableStream)
    const filename = body.filename?.trim() || 'import.xlsx'
    const base64 = body.base64?.trim()

    if (!base64) {
      sendJson(res, 400, { ok: false, error: 'Нет содержимого файла.' })
      return true
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'html-convert-excel-'))
    const extension = path.extname(filename) || '.xlsx'
    const sourcePath = path.join(tempDir, `source${extension}`)
    const outputPath = path.join(tempDir, 'export.png')

    await fs.writeFile(sourcePath, Buffer.from(base64, 'base64'))
    await runExcelExport(sourcePath, outputPath)

    const imageBuffer = await fs.readFile(outputPath)
    sendJson(res, 200, {
      ok: true,
      dataUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось импортировать Excel-визуал.'
    sendJson(res, 500, { ok: false, error: message })
    return true
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  }
}

const localExcelImportPlugin = () => ({
  name: 'local-excel-visual-import',
  configureServer(server: { middlewares: { use: (handler: (req: unknown, res: unknown, next: () => void) => void) => void } }) {
    server.middlewares.use(async (req, res, next) => {
      const apiHandled = await apiHandler(
        req as unknown as NodeJS.ReadableStream & { method?: string; url?: string; headers: Record<string, string> },
        res as unknown as {
          statusCode: number
          setHeader: (name: string, value: string) => void
          end: (chunk?: string) => void
        },
      )

      if (apiHandled) {
        return
      }

      const handled = await excelVisualImportMiddleware(
        req as { method?: string; url?: string },
        res as {
          statusCode: number
          setHeader: (name: string, value: string) => void
          end: (chunk: string) => void
        },
      )

      if (!handled) {
        next()
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localExcelImportPlugin()],
})
