import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Vite config consumes the runtime .mjs helper directly.
import { createApiHandler } from './server/api.mjs'

const apiHandler = createApiHandler({
  dataDir: path.resolve(import.meta.dirname, '.local-server-data'),
  jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
})

export default defineConfig({
  plugins: [react(), {
    name: 'editor-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (!await apiHandler(req, res)) next()
        } catch (error) {
          next(error)
        }
      })
    },
  }],
})
