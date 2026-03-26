import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const BODY_LIMIT = 30 * 1024 * 1024
const SESSION_COOKIE = 'primorye_news_editor_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const noContent = (res) => {
  res.statusCode = 204
  res.end('')
}

const readBody = async (req) => {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > BODY_LIMIT) {
      throw new Error('Слишком большой запрос.')
    }
    chunks.push(buffer)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const ensureDataFile = async (filePath, fallback) => {
  try {
    await fs.access(filePath)
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8')
  }
}

const createWriteQueue = () => {
  let queue = Promise.resolve()

  return (task) => {
    queue = queue.then(task, task)
    return queue
  }
}

const writeSerial = createWriteQueue()

const parseCookies = (cookieHeader = '') =>
  Object.fromEntries(
    cookieHeader
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((pair) => {
        const index = pair.indexOf('=')
        return index === -1
          ? [pair, '']
          : [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))]
      }),
  )

const base64UrlEncode = (value) =>
  Buffer.from(value).toString('base64url')

const base64UrlDecode = (value) =>
  Buffer.from(value, 'base64url').toString('utf8')

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash: `${salt}:${hash}` }
}

const verifyPassword = (password, storedHash) => {
  const [salt, hash] = String(storedHash).split(':')
  if (!salt || !hash) {
    return false
  }
  const next = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex'))
}

const signToken = (payload, secret) => {
  const payloadString = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('base64url')
  return `${payloadString}.${signature}`
}

const verifyToken = (token, secret) => {
  if (!token || !token.includes('.')) {
    return null
  }

  const [payloadString, signature] = token.split('.')
  const expected = crypto.createHmac('sha256', secret).update(payloadString).digest('base64url')
  if (signature !== expected) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadString))
    if (!payload?.userId || !payload?.exp || payload.exp < Date.now()) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

const setSessionCookie = (res, token) => {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000,
    )}`,
  )
}

const clearSessionCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  )
}

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  createdAt: user.createdAt,
})

const createStorage = (dataDir) => {
  const usersFile = path.join(dataDir, 'users.json')
  const workspacesFile = path.join(dataDir, 'workspaces.json')

  const ensure = async () => {
    await ensureDataFile(usersFile, { users: [] })
    await ensureDataFile(workspacesFile, { workspaces: {} })
  }

  const readUsers = async () => {
    await ensure()
    const raw = await fs.readFile(usersFile, 'utf8')
    return JSON.parse(raw)
  }

  const writeUsers = async (value) =>
    writeSerial(() => fs.writeFile(usersFile, JSON.stringify(value, null, 2), 'utf8'))

  const readWorkspaces = async () => {
    await ensure()
    const raw = await fs.readFile(workspacesFile, 'utf8')
    return JSON.parse(raw)
  }

  const writeWorkspaces = async (value) =>
    writeSerial(() => fs.writeFile(workspacesFile, JSON.stringify(value, null, 2), 'utf8'))

  return {
    readUsers,
    writeUsers,
    readWorkspaces,
    writeWorkspaces,
  }
}

const getUserFromRequest = async (req, storage, secret) => {
  const cookies = parseCookies(req.headers.cookie)
  const payload = verifyToken(cookies[SESSION_COOKIE], secret)
  if (!payload) {
    return null
  }

  const usersState = await storage.readUsers()
  return usersState.users.find((item) => item.id === payload.userId) ?? null
}

const ensureUserWorkspaceState = (workspacesState, userId) => {
  if (!workspacesState.workspaces[userId]) {
    workspacesState.workspaces[userId] = {
      autosave: null,
      saved: [],
    }
  }

  return workspacesState.workspaces[userId]
}

export const createApiHandler = ({ dataDir, jwtSecret }) => {
  const storage = createStorage(dataDir)

  return async (req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://localhost')
    const pathname = requestUrl.pathname

    if (pathname === '/api/health' && req.method === 'GET') {
      json(res, 200, { ok: true })
      return true
    }

    if (pathname === '/api/auth/session' && req.method === 'GET') {
      const user = await getUserFromRequest(req, storage, jwtSecret)
      json(res, 200, { ok: true, user: user ? sanitizeUser(user) : null })
      return true
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await readBody(req)
      const username = String(body.username || '').trim()
      const password = String(body.password || '')

      if (username.length < 3) {
        json(res, 400, { ok: false, error: 'Логин должен быть не короче 3 символов.' })
        return true
      }

      if (password.length < 4) {
        json(res, 400, { ok: false, error: 'Пароль должен быть не короче 4 символов.' })
        return true
      }

      const usersState = await storage.readUsers()
      const exists = usersState.users.some(
        (item) => String(item.username).trim().toLowerCase() === username.toLowerCase(),
      )

      if (exists) {
        json(res, 409, { ok: false, error: 'Такой логин уже существует.' })
        return true
      }

      const user = {
        id: crypto.randomUUID(),
        username,
        passwordHash: hashPassword(password).hash,
        createdAt: new Date().toISOString(),
      }

      usersState.users.push(user)
      await storage.writeUsers(usersState)
      setSessionCookie(
        res,
        signToken({ userId: user.id, exp: Date.now() + SESSION_TTL_MS }, jwtSecret),
      )
      json(res, 200, { ok: true, user: sanitizeUser(user) })
      return true
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req)
      const username = String(body.username || '').trim().toLowerCase()
      const password = String(body.password || '')
      const usersState = await storage.readUsers()
      const user = usersState.users.find(
        (item) => String(item.username).trim().toLowerCase() === username,
      )

      if (!user || !verifyPassword(password, user.passwordHash)) {
        json(res, 401, { ok: false, error: 'Неверный логин или пароль.' })
        return true
      }

      setSessionCookie(
        res,
        signToken({ userId: user.id, exp: Date.now() + SESSION_TTL_MS }, jwtSecret),
      )
      json(res, 200, { ok: true, user: sanitizeUser(user) })
      return true
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      clearSessionCookie(res)
      json(res, 200, { ok: true })
      return true
    }

    const user = await getUserFromRequest(req, storage, jwtSecret)
    if (!user && pathname.startsWith('/api/')) {
      json(res, 401, { ok: false, error: 'Нужна авторизация.' })
      return true
    }

    if (pathname === '/api/autosave' && req.method === 'GET') {
      const workspacesState = await storage.readWorkspaces()
      const state = ensureUserWorkspaceState(workspacesState, user.id)
      json(res, 200, { ok: true, document: state.autosave || null })
      return true
    }

    if (pathname === '/api/autosave' && req.method === 'PUT') {
      const body = await readBody(req)
      const workspacesState = await storage.readWorkspaces()
      const state = ensureUserWorkspaceState(workspacesState, user.id)
      state.autosave = body.document || null
      await storage.writeWorkspaces(workspacesState)
      json(res, 200, { ok: true })
      return true
    }

    if (pathname === '/api/workspaces' && req.method === 'GET') {
      const workspacesState = await storage.readWorkspaces()
      const state = ensureUserWorkspaceState(workspacesState, user.id)
      const workspaces = [...state.saved].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      json(res, 200, { ok: true, workspaces })
      return true
    }

    if (pathname === '/api/workspaces' && req.method === 'POST') {
      const body = await readBody(req)
      const workspacesState = await storage.readWorkspaces()
      const state = ensureUserWorkspaceState(workspacesState, user.id)
      const workspaceId = String(body.workspaceId || '').trim() || crypto.randomUUID()
      const nextWorkspace = {
        id: workspaceId,
        title: String(body.document?.title || '').trim() || 'Без названия',
        updatedAt: new Date().toISOString(),
        document: body.document,
      }
      const index = state.saved.findIndex((item) => item.id === workspaceId)
      if (index === -1) {
        state.saved.unshift(nextWorkspace)
      } else {
        state.saved[index] = nextWorkspace
      }
      state.saved.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      await storage.writeWorkspaces(workspacesState)
      json(res, 200, { ok: true, workspace: nextWorkspace })
      return true
    }

    if (pathname.startsWith('/api/workspaces/') && req.method === 'DELETE') {
      const workspaceId = decodeURIComponent(pathname.slice('/api/workspaces/'.length))
      const workspacesState = await storage.readWorkspaces()
      const state = ensureUserWorkspaceState(workspacesState, user.id)
      state.saved = state.saved.filter((item) => item.id !== workspaceId)
      await storage.writeWorkspaces(workspacesState)
      noContent(res)
      return true
    }

    return false
  }
}
