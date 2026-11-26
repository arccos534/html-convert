import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchImageAsDataUrl, isEmbeddedImageSource, readPhotoAsDataUrl } from '../../lib/documentIO'
import { getImageLayout, getImagePhotos } from '../../lib/imageLayout'
import { hasMeaningfulHtml, sanitizeHtml } from '../../lib/sanitizeHtml'
import type { ImageBlock, ImageData, ImagePhoto } from '../../types'
import { RichTextEditor } from './RichTextEditor'
import { FormattedTextField } from './FormattedTextField'
import { getFormattedTextHtml } from '../../lib/formattedText'
import '../../lib/imageLayout.css'
import '../../lib/imageCollage.css'

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
  const photos = getImagePhotos(data)
  const hasImage = photos.length > 0
  const embedded = isEmbeddedImageSource(data.src)
  const hasText = hasMeaningfulHtml(data.textHtml)
  const layout = getImageLayout(data, hasText)
  const fileInput = useRef<HTMLInputElement>(null)
  const replacementInput = useRef<HTMLInputElement>(null)
  const replacementIndex = useRef(0)
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

  const setPhotos = (photos: ImagePhoto[]) => {
    const [first, ...additionalPhotos] = photos
    update({
      src: first?.src ?? '',
      alt: first?.alt ?? latest.current.block.data.alt,
      additionalPhotos: additionalPhotos.length ? additionalPhotos : undefined,
    })
  }

  const load = async <T,>(read: () => Promise<T>, commit: (result: T, photos: ImagePhoto[]) => void, errorMessage: string) => {
    const operation = ++sourceOperation.current
    const original = latest.current.block.data
    setLoading(true)
    setError('')
    try {
      const result = await read()
      const current = latest.current.block.data
      if (operation === sourceOperation.current && current.src === original.src && current.additionalPhotos === original.additionalPhotos) {
        commit(result, getImagePhotos(current))
      }
    } catch {
      if (operation === sourceOperation.current) setError(errorMessage)
    } finally {
      if (operation === sourceOperation.current) setLoading(false)
    }
  }

  const loadFiles = (files: File[], target?: number) => load(async () => {
    const added: ImagePhoto[] = []
    for (const file of files) {
      try {
        const src = await readPhotoAsDataUrl(file)
        if (isEmbeddedImageSource(src)) added.push({ src, alt: file.name.replace(/\.[^.]+$/, '') })
      } catch {
        // Keep the photos that were read successfully.
      }
    }
    if (!added.length) throw new Error()
    return added
  }, (added, photos) => {
    if (target === undefined) {
      if (!photos.length && added.length === 1) added[0].alt = latest.current.block.data.alt || added[0].alt
      setPhotos([...photos, ...added])
    } else {
      setPhotos(photos.map((photo, index) => index === target ? { ...added[0], alt: photo.alt || added[0].alt } : photo))
    }
    if (added.length < files.length) setError('Часть файлов не удалось загрузить.')
  }, 'Не удалось открыть файлы изображений. Выберите другие файлы.')

  const replacePhoto = (index: number) => {
    replacementIndex.current = index
    replacementInput.current?.click()
  }

  const movePhoto = (index: number, offset: -1 | 1) => {
    const next = [...photos]
    const photo = next[index]
    next[index] = next[index + offset]
    next[index + offset] = photo
    setPhotos(next)
  }

  const moveCaptionToText = () => {
    const paragraph = document.createElement('p')
    paragraph.textContent = data.caption.trim()
    update({ caption: '', captionHtml: undefined, textHtml: paragraph.outerHTML })
  }

  const renderPhoto = ({ src, alt }: ImagePhoto) => (
    <img src={src} alt={alt} style={{
      borderRadius: layout.radius,
      boxShadow: data.shadow ? '0 14px 30px rgba(15,23,42,0.16)' : undefined,
      padding: data.withPadding ? 12 : undefined,
      background: data.withPadding ? '#fff' : undefined,
    }} />
  )

  return (
    <section
      className={`content-block news-image-context ${selected ? 'is-selected' : ''}`}
      style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
      onClick={onSelect}
    >
      {editable && !chartMedia && (
        <div className="image-card-controls">
          <div className="image-card-actions">
            <button type="button" className="settings-action-button" disabled={loading} onClick={() => fileInput.current?.click()}>
              {hasImage ? 'Добавить фото' : 'Загрузить фото'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              aria-label="Файл изображения"
              hidden
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? [])
                event.currentTarget.value = ''
                if (files.length) void loadFiles(files)
              }}
            />
            <input ref={replacementInput} type="file" accept="image/*" hidden aria-label="Файл для замены" onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) void loadFiles([file], replacementIndex.current)
            }} />
            {editing && hasImage && !layout.collage && (
              <>
                <button type="button" className="settings-action-button" disabled={loading} onClick={() => replacePhoto(0)}>Заменить фото</button>
                <button type="button" className="settings-action-button" disabled={loading} onClick={() => setPhotos([])}>Убрать фото</button>
              </>
            )}
            {editing && data.caption.trim() && !hasText && (
              <button type="button" className="settings-action-button" onClick={moveCaptionToText}>
                Перенести подпись в основной текст
              </button>
            )}
          </div>
          {editing && layout.collage && (
            <details className="image-card-source image-photo-manager">
              <summary>Порядок и описания фото ({photos.length})</summary>
              <ol>
                {photos.map((photo, index) => (
                  <li key={index}>
                    <img src={photo.src} alt="" />
                    <input className="inline-edit-input" aria-label={`Alt-текст фото ${index + 1}`} placeholder="Описание фото" value={photo.alt}
                      disabled={loading} onChange={(event) => setPhotos(photos.map((item, position) => position === index ? { ...item, alt: event.target.value } : item))} />
                    <div className="image-photo-actions">
                      <button type="button" className="settings-action-button" disabled={loading || index === 0}
                        aria-label={`Переместить фото ${index + 1} раньше`} onClick={() => movePhoto(index, -1)}>↑</button>
                      <button type="button" className="settings-action-button" disabled={loading || index === photos.length - 1}
                        aria-label={`Переместить фото ${index + 1} позже`} onClick={() => movePhoto(index, 1)}>↓</button>
                      <button type="button" className="settings-action-button" disabled={loading} aria-label={`Заменить фото ${index + 1}`}
                        onClick={() => replacePhoto(index)}>Заменить</button>
                      <button type="button" className="settings-action-button" disabled={loading} aria-label={`Убрать фото ${index + 1}`}
                        onClick={() => setPhotos(photos.filter((_, position) => position !== index))}>Убрать</button>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {editing && (
            <details className="image-card-source">
              <summary>Фото по ссылке</summary>
              <form onSubmit={(event) => {
                event.preventDefault()
                const src = new FormData(event.currentTarget).get('imageUrl')
                if (typeof src !== 'string' || !src.trim()) return
                const submitter = (event.nativeEvent as SubmitEvent).submitter
                if (submitter instanceof HTMLButtonElement && submitter.value === 'append') {
                  setPhotos([...photos, { src: src.trim(), alt: '' }])
                  event.currentTarget.reset()
                } else {
                  setSource(src.trim())
                }
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
                <button type="submit" className="settings-action-button" disabled={loading}>{layout.collage ? 'Заменить первое фото' : 'Применить'}</button>
                {hasImage && <button type="submit" value="append" className="settings-action-button" disabled={loading}>Добавить по ссылке</button>}
              </form>
              {hasImage && !embedded && (
                <button type="button" className="settings-action-button" disabled={loading} onClick={() => {
                  void load(async () => {
                    const src = await fetchImageAsDataUrl(data.src)
                    if (!isEmbeddedImageSource(src)) throw new Error()
                    return src
                  }, (src) => update({ src }), 'Не удалось встроить фото по ссылке. Попробуйте загрузить файл.')
                }}>{layout.collage ? 'Встроить первое фото в HTML' : 'Встроить фото в HTML'}</button>
              )}
              {embedded && <p>{layout.collage ? 'Первое фото встроено в HTML.' : 'Фото встроено в HTML.'}</p>}
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
            {media || (layout.collage ? (
              <div className={layout.collageClassName}>
                {photos.map((photo, index) => <div key={index} className="image-tile">{renderPhoto(photo)}</div>)}
              </div>
            ) : hasImage ? renderPhoto(photos[0]) : <div className="image-placeholder">Место для фото</div>)}
            {editing && !chartMedia ? (
              <div className="image-caption-edit"><FormattedTextField value={data.caption} html={data.captionHtml} tag="span"
                ariaLabel={layout.collage ? 'Подпись к коллажу' : 'Подпись под фото'} readOnly={!editing}
                onChange={(caption, captionHtml) => update({ caption, captionHtml })} /></div>
            ) : !chartMedia && data.caption && <figcaption dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(data.caption, data.captionHtml, 'span') }} />}
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
