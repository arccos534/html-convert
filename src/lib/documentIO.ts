import type { ArticleDocument } from '../types'

const DRAFT_KEY = 'bitrix-news-builder:draft'

export const saveDraftToStorage = (document: ArticleDocument) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(document))
}

export const loadDraftFromStorage = (): ArticleDocument | null => {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as ArticleDocument
    if (!parsed || !Array.isArray(parsed.blocks)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const downloadTextFile = (fileName: string, content: string, mime = 'text/plain') => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsText(file)
  })

export const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Не удалось загрузить изображение'))
    reader.readAsDataURL(file)
  })

export const fetchImageAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Не удалось скачать изображение')
  }

  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Не удалось встроить изображение'))
    reader.readAsDataURL(blob)
  })
}

export const isEmbeddedImageSource = (value: string) => /^data:image\//i.test(value.trim())

export const copyToClipboard = async (value: string) => {
  await navigator.clipboard.writeText(value)
}

