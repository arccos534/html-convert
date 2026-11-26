import { sanitizeHtml } from './sanitizeHtml'

const normalized = (value: string) => value.replace(/\s+/g, ' ').trim()

export const formattedHtmlMatchesText = (html: string | undefined, text: string) => {
  if (!html?.trim()) return false
  const extracted = new DOMParser().parseFromString(sanitizeHtml(html), 'text/html').body.textContent || ''
  return normalized(extracted) === normalized(text)
}

export const escapeText = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

export const getFormattedTextHtml = (text: string, html: string | undefined, tag: string) =>
  formattedHtmlMatchesText(html, text) ? sanitizeHtml(html!) : `<${tag}>${escapeText(text)}</${tag}>`

export const getFormattedTextInnerHtml = (text: string, html: string | undefined) => {
  if (!formattedHtmlMatchesText(html, text)) return escapeText(text)
  const doc = new DOMParser().parseFromString(sanitizeHtml(html!), 'text/html')
  return Array.from(doc.body.childNodes).map((node) => node instanceof HTMLElement ? node.innerHTML : escapeText(node.textContent || '')).join('')
}
