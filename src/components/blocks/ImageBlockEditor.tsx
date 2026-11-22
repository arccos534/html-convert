import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchImageAsDataUrl, isEmbeddedImageSource, readImageAsDataUrl } from '../../lib/documentIO'
import { getImageLayout } from '../../lib/imageLayout'
import { hasMeaningfulHtml, sanitizeHtml } from '../../lib/sanitizeHtml'
import type { ImageBlock, ImageData } from '../../types'
import { RichTextEditor } from './RichTextEditor'
import '../../lib/imageLayout.css'

interface ImageBlockEditorProps {
  block: ImageBlock
  selected: boolean
  editable: boolean
  onSelect: () => void
  chartMedia?: boolean
  media?: ReactNode
  onChange: (block: ImageBlock) => void
}

export const ImageBlockEditor = ({ block, selected, editable, onSelect, onChange, chartMedia = false, media }: ImageBlockEditorProps) => {
  const { data } = block
  const editing = editable && selected
  const hasImage = Boolean(data.src.trim())
  const embedded = isEmbeddedImageSource(data.src)
  const hasText = hasMeaningfulHtml(data.textHtml)
  const layout = getImageLayout(data, hasText)
  const fileInput = useRef<HTMLInputElement>(null)
  const sourceOperation = useRef(0)
  const latest = useRef({ block, onChange })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useLayoutEffect(() => {
    latest.current = { block, onChange }
  }, [block, onChange])

  useLayoutEffect(() => () => {
    sourceOperation.current += 1
  }, [])

  const update = (patch: Partial<ImageData>) => {
    const current = latest.current
    current.onChange({ ...current.block, data: { ...current.block.data, ...patch } })
  }

  const setSource = (src: string) => {
    sourceOperation.current += 1
    setLoading(false)
    setError('')
    update({ src })
  }

  const loadSource = async (read: () => Promise<string>, errorMessage: string, fileName?: string) => {
    const operation = ++sourceOperation.current
    const originalSource = latest.current.block.data.src
    setLoading(true)
    setError('')
    try {
      const src = await read()
      if (!isEmbeddedImageSource(src)) throw new Error(errorMessage)
      if (operation === sourceOperation.current && latest.current.block.data.src === originalSource) {
        const alt = latest.current.block.data.alt
        update({ src, alt: alt || fileName?.replace(/\.[^.]+$/, '') || '' })
      }
    } catch {
      if (operation === sourceOperation.current) setError(errorMessage)
    } finally {
      if (operation === sourceOperation.current) setLoading(false)
    }
  }

  const moveCaptionToText = () => {
    const paragraph = document.createElement('p')
    paragraph.textContent = data.caption.trim()
    update({ caption: '', textHtml: paragraph.outerHTML })
  }

  return (
    <section
      className={`content-block news-image-context ${selected ? 'is-selected' : ''}`}
      style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
      onClick={onSelect}
    >
      {editable && !chartMedia && (
        <div className="image-card-controls">
          <div className="image-card-actions">
            <button type="button" className="settings-action-button" onClick={() => fileInput.current?.click()}>
              {hasImage ? 'Заменить фото' : 'Загрузить фото'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              aria-label="Файл изображения"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (file) void loadSource(() => readImageAsDataUrl(file), 'Не удалось открыть файл изображения. Выберите другой файл.', file.name)
              }}
            />
            {editing && hasImage && (
              <button type="button" className="settings-action-button" onClick={() => setSource('')}>Убрать фото</button>
            )}
            {editing && data.caption.trim() && !hasText && (
              <button type="button" className="settings-action-button" onClick={moveCaptionToText}>
                Перенести подпись в основной текст
              </button>
            )}
          </div>
          {editing && (
            <details className="image-card-source">
              <summary>Фото по ссылке</summary>
              <form onSubmit={(event) => {
                event.preventDefault()
                const src = new FormData(event.currentTarget).get('imageUrl')
                if (typeof src === 'string' && src.trim()) setSource(src.trim())
              }}>
                <input
                  key={embedded ? 'embedded' : data.src}
                  className="inline-edit-input"
                  name="imageUrl"
                  aria-label="URL изображения"
                  inputMode="url"
                  placeholder="https://"
                  defaultValue={embedded ? '' : data.src}
                  required
                />
                <button type="submit" className="settings-action-button">Применить</button>
              </form>
              {hasImage && !embedded && (
                <button type="button" className="settings-action-button" disabled={loading} onClick={() => {
                  void loadSource(() => fetchImageAsDataUrl(data.src), 'Не удалось встроить фото по ссылке. Попробуйте загрузить файл.')
                }}>Встроить фото в HTML</button>
              )}
              {embedded && <p>Фото встроено в HTML.</p>}
            </details>
          )}
          {loading && <p role="status">Загружаем фото…</p>}
          {error && <p role="alert">{error}</p>}
        </div>
      )}
      <div className="news-image-shell">
        <div className={layout.className} style={{
          ['--news-image-width' as string]: `${layout.width}%`,
          ['--news-image-gap' as string]: `${layout.gap}px`,
        }}>
          <figure className="image-wrap">
            {media || (hasImage ? (
              <img src={data.src} alt={data.alt} style={{
                borderRadius: layout.radius,
                boxShadow: data.shadow ? '0 14px 30px rgba(15,23,42,0.16)' : undefined,
                padding: data.withPadding ? 12 : undefined,
                background: data.withPadding ? '#fff' : undefined,
              }} />
            ) : <div className="image-placeholder">Место для фото</div>)}
            {editing && !chartMedia ? (
              <input
                className="inline-edit-input image-caption-edit"
                aria-label="Подпись под фото"
                placeholder="Подпись под фото"
                value={data.caption}
                onChange={(event) => update({ caption: event.target.value })}
              />
            ) : !chartMedia && data.caption && <figcaption>{data.caption}</figcaption>}
          </figure>
          {editing ? (
            <div className={`image-copy ${hasText ? '' : 'image-copy-empty'}`}>
              <RichTextEditor
                value={data.textHtml || '<p></p>'}
                ariaLabel={chartMedia ? "Основной текст диаграммы" : "Основной текст блока изображения"}
                placeholder="Введите основной текст"
                paragraphGap={10}
                requireSelectionForToolbarActions
                onChange={(textHtml) => update({ textHtml })}
              />
            </div>
          ) : hasText && (
            <div className="image-copy image-copy-richtext rich-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.textHtml) }} />
          )}
        </div>
      </div>
    </section>
  )
}
