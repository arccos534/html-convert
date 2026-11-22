import createDOMPurify from 'dompurify'

const purifier = createDOMPurify(window)

export const hasMeaningfulHtml = (value?: string) =>
  Boolean(value && value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\s+/g, ' ').trim())

purifier.addHook('uponSanitizeAttribute', (_node, attribute) => {
  if (attribute.attrName !== 'style') return
  if (/[@\\]|\/\*|url\s*\(|(?:image(?:-set)?|src|expression)\s*\(/i.test(attribute.attrValue)) {
    attribute.keepAttr = false
  }
})

export const sanitizeHtml = (value: string): string => purifier.sanitize(value, {
  ALLOWED_TAGS: [
    'a', 'article', 'aside', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'figcaption', 'figure',
    'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'li',
    'main', 'ol', 'p', 'pre', 's', 'section', 'small', 'span', 'strong', 'sub', 'sup',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  ],
  ALLOWED_ATTR: ['alt', 'class', 'colspan', 'height', 'href', 'rel', 'role', 'rowspan', 'scope', 'src', 'start', 'style', 'title', 'width'],
  ALLOW_DATA_ATTR: false,
})
