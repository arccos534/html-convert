import type { ArticleDocument } from '../types'

export type ThemeMode = 'light' | 'dark'

export interface AccountProfile {
  id: string
  username: string
  createdAt: string
}

export interface SavedWorkspace {
  id: string
  title: string
  updatedAt: string
  document: ArticleDocument
}

const THEME_KEY = 'bitrix-news-builder:theme:v1'

const apiFetch = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
  } & T

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Ошибка запроса к серверу.')
  }

  return data
}

export const loadThemePreference = (): ThemeMode =>
  localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'

export const saveThemePreference = (theme: ThemeMode) => {
  localStorage.setItem(THEME_KEY, theme)
}

export const fetchCurrentSession = async (): Promise<AccountProfile | null> => {
  const result = await apiFetch<{ user: AccountProfile | null }>('/api/auth/session', {
    method: 'GET',
    headers: {},
  })
  return result.user
}

export const registerAccount = async (
  username: string,
  password: string,
): Promise<AccountProfile> => {
  const result = await apiFetch<{ user: AccountProfile }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return result.user
}

export const loginAccount = async (
  username: string,
  password: string,
): Promise<AccountProfile> => {
  const result = await apiFetch<{ user: AccountProfile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return result.user
}

export const logoutAccount = async (): Promise<void> => {
  await apiFetch<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export const loadUserAutosave = async (): Promise<ArticleDocument | null> => {
  const result = await apiFetch<{ document: ArticleDocument | null }>('/api/autosave', {
    method: 'GET',
    headers: {},
  })
  return result.document
}

export const saveUserAutosave = async (document: ArticleDocument): Promise<void> => {
  await apiFetch<{ ok: true }>('/api/autosave', {
    method: 'PUT',
    body: JSON.stringify({ document }),
  })
}

export const loadSavedWorkspaces = async (): Promise<SavedWorkspace[]> => {
  const result = await apiFetch<{ workspaces: SavedWorkspace[] }>('/api/workspaces', {
    method: 'GET',
    headers: {},
  })
  return result.workspaces
}

export const saveWorkspaceSnapshot = async (
  document: ArticleDocument,
  currentWorkspaceId: string | null,
): Promise<string> => {
  const result = await apiFetch<{ workspace: SavedWorkspace }>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ document, workspaceId: currentWorkspaceId }),
  })
  return result.workspace.id
}

export const deleteWorkspaceSnapshot = async (workspaceId: string): Promise<void> => {
  await apiFetch<{ ok: true }>(`/api/workspaces/${workspaceId}`, {
    method: 'DELETE',
    headers: {},
  })
}
