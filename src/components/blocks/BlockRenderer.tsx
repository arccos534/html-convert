import { useRef } from 'react'
import type { ArticleBlock } from '../../types'
import { readImageAsDataUrl } from '../../lib/documentIO'
import {
  importSpreadsheetFile,
  renderChartItemsToSvgDataUrl,
  renderTableToSvgDataUrl,
} from '../../lib/chartImport'
import { importExactSpreadsheetVisual } from '../../lib/excelVisualImport'
import { buildHeroBackground, getHeroTextColor } from '../../lib/heroBackground'
import { resolveButtonStyle } from '../../lib/buttonStyle'
import { RichTextEditor } from './RichTextEditor'

interface BlockRendererProps {
  block: ArticleBlock
  selected: boolean
  editable: boolean
  onSelect: () => void
  onChange: (block: ArticleBlock) => void
}

const alignMap = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const

const getCardHtml = (
  item: { html?: string; title?: string; content?: string; stat?: string },
  index: number,
) => {
  if (item.html) {
    return item.html
  }

  const stat = item.stat?.trim() || '+24%'
  const title = item.title?.trim() || `Карточка ${index + 1}`
  const content = item.content?.trim() || 'Добавьте текст карточки.'
  return `<p><span style="color:#1e67dc;font-size:22px;font-weight:700;">${stat}</span></p><h3>${title}</h3><p>${content}</p>`
}

const getQuoteHtml = (data: { html?: string; quote: string }) =>
  data.html || `<p>${data.quote}</p>`

const getQuoteFooterHtml = (data: { footerHtml?: string; author: string; source: string }) =>
  data.footerHtml || `<p>${[data.author, data.source].filter(Boolean).join(', ')}</p>`

const hasMeaningfulHtml = (value?: string) =>
  Boolean(value && value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())

const getChartTitleHtml = (data: { titleHtml?: string; title: string }) =>
  data.titleHtml || `<h3>${data.title}</h3>`

const getChartDescriptionHtml = (data: { descriptionHtml?: string; description: string }) =>
  data.descriptionHtml || `<p>${data.description}</p>`

const getChartSideTextHtml = (data: { textHtml?: string }) => data.textHtml || ''

const getChartCombinedHtml = (data: {
  titleHtml?: string
  title: string
  descriptionHtml?: string
  description: string
}) => `${getChartTitleHtml(data)}${getChartDescriptionHtml(data)}`

const getHeroTitleHtml = (data: { titleHtml?: string; title: string }) =>
  data.titleHtml || `<h1>${data.title}</h1>`

const getHeroSubtitleHtml = (data: { subtitleHtml?: string; subtitle: string }) =>
  data.subtitleHtml || `<p>${data.subtitle}</p>`

const parsePlainText = (html: string, fallback: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || fallback

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '').trim()
  const full = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : normalized

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return `rgba(247, 196, 118, ${alpha})`
  }

  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const parseChartTextHtml = (html: string) => {
  if (typeof window === 'undefined') {
    return {
      titleHtml: `<h3>${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Заголовок'}</h3>`,
      title: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Заголовок',
      descriptionHtml: '<p></p>',
      description: '',
    }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  const elementNodes = Array.from(root?.children ?? [])
  const titleElement = elementNodes[0] as HTMLElement | undefined
  const descriptionHtml = elementNodes
    .slice(1)
    .map((node) => node.outerHTML)
    .join('') || '<p></p>'

  return {
    titleHtml: titleElement?.outerHTML || '<h3>Заголовок</h3>',
    title: titleElement?.textContent?.replace(/\s+/g, ' ').trim() || 'Заголовок',
    descriptionHtml,
    description: descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  }
}

const getChartMax = (data: {
  max: number
  importSource?: 'manual' | 'excel' | 'excelVisual' | 'image'
  autoMax?: boolean
  items: Array<{ value: number }>
}) =>
  data.importSource === 'excel'
    ? Math.max(1, ...data.items.map((item) => item.value))
    : Math.max(1, data.max, ...data.items.map((item) => item.value))

const stopInlineEvent = (event: React.MouseEvent | React.FocusEvent) => {
  event.stopPropagation()
}

const applyImportedChartFile = async (
  file: File,
  block: Extract<ArticleBlock, { type: 'chart' }>,
  onChange: (block: ArticleBlock) => void,
) => {
  const fileName = file.name.toLowerCase()
  const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(fileName)
  const isImageFile =
    file.type.startsWith('image/') || /\.(svg|png|jpe?g|webp)$/i.test(fileName)

  if (isSpreadsheet) {
    const exactVisual = await importExactSpreadsheetVisual(file)
    if (exactVisual) {
      onChange({
        ...block,
        data: {
          ...block.data,
          importSource: 'excelVisual',
          imageSrc: exactVisual,
          imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Диаграмма',
          tableHeaders: [],
          tableRows: [],
        },
      })
      return
    }

    const imported = await importSpreadsheetFile(file)
    if (!imported) {
      window.alert('Не удалось распознать данные файла.')
      return
    }

    if (imported.kind === 'chart') {
      onChange({
        ...block,
        data: {
          ...block.data,
          importSource: 'excel',
          imageSrc:
            imported.svgDataUrl ||
            renderChartItemsToSvgDataUrl(imported.items, {
              title: block.data.title,
              subtitle: block.data.description,
            }),
          imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Диаграмма',
          items: imported.items,
          max: imported.max,
          tableHeaders: [],
          tableRows: [],
        },
      })
      return
    }

    onChange({
      ...block,
      data: {
        ...block.data,
        importSource: 'excel',
        imageSrc:
          imported.svgDataUrl ||
          renderTableToSvgDataUrl(imported.headers, imported.rows, {
            title: block.data.title,
            subtitle: block.data.description,
          }),
        imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Таблица',
        tableHeaders: imported.headers,
        tableRows: imported.rows,
      },
    })
    return
  }

  if (isImageFile) {
    const src = await readImageAsDataUrl(file)
    onChange({
      ...block,
      data: {
        ...block.data,
        importSource: 'image',
        imageSrc: src,
        imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Диаграмма',
        tableHeaders: [],
        tableRows: [],
      },
    })
    return
  }

  window.alert('Поддерживаются Excel, CSV и изображения.')
}

const InlineInput = ({
  value,
  onChange,
  className,
  placeholder,
  style,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  style?: React.CSSProperties
}) => (
  <input
    className={`inline-edit-input ${className || ''}`.trim()}
    value={value}
    placeholder={placeholder}
    style={style}
    onClick={stopInlineEvent}
    onFocus={stopInlineEvent}
    onChange={(event) => onChange(event.target.value)}
  />
)

const InlineTextarea = ({
  value,
  onChange,
  className,
  placeholder,
  rows = 2,
  style,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  rows?: number
  style?: React.CSSProperties
}) => (
  <textarea
    className={`inline-edit-textarea ${className || ''}`.trim()}
    value={value}
    placeholder={placeholder}
    rows={rows}
    style={style}
    onClick={stopInlineEvent}
    onFocus={stopInlineEvent}
    onChange={(event) => onChange(event.target.value)}
  />
)

export const BlockRenderer = ({
  block,
  selected,
  editable,
  onSelect,
  onChange,
}: BlockRendererProps) => {
  const canEdit = editable && selected
  const chartColorInputsRef = useRef<Record<string, HTMLInputElement | null>>({})

  switch (block.type) {
    case 'hero':
      return (
        <section
          className={`content-block hero-block ${selected ? 'is-selected' : ''}`}
          style={{
            marginTop: block.spacing.marginTop,
            marginBottom: block.spacing.marginBottom,
            background: buildHeroBackground(block.data),
            color: getHeroTextColor(block.data),
            textAlign: block.data.align,
          }}
          onClick={onSelect}
        >
          {canEdit ? (
            <>
              <div className="hero-richtext-group">
                <RichTextEditor
                  value={getHeroTitleHtml(block.data)}
                  align={block.data.align}
                  paragraphGap={10}
                  readOnly={!canEdit}
                  requireSelectionForToolbarActions
                  onAlignChange={(align) => onChange({ ...block, data: { ...block.data, align } })}
                  onChange={(titleHtml) =>
                    onChange({
                      ...block,
                      data: {
                        ...block.data,
                        titleHtml,
                        title: parsePlainText(titleHtml, 'Заголовок главной новости'),
                      },
                    })
                  }
                />
              </div>
              <div className="hero-richtext-group hero-subtitle-group">
                <RichTextEditor
                  value={getHeroSubtitleHtml(block.data)}
                  align={block.data.align}
                  paragraphGap={8}
                  readOnly={!canEdit}
                  requireSelectionForToolbarActions
                  onAlignChange={(align) => onChange({ ...block, data: { ...block.data, align } })}
                  onChange={(subtitleHtml) =>
                    onChange({
                      ...block,
                      data: {
                        ...block.data,
                        subtitleHtml,
                        subtitle: parsePlainText(subtitleHtml, ''),
                      },
                    })
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div
                className="hero-richtext hero-title-richtext"
                dangerouslySetInnerHTML={{ __html: getHeroTitleHtml(block.data) }}
              />
              <div
                className="hero-richtext hero-subtitle-richtext"
                dangerouslySetInnerHTML={{ __html: getHeroSubtitleHtml(block.data) }}
              />
            </>
          )}
        </section>
      )

    case 'newsIntro':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{
            marginTop: block.spacing.marginTop,
            marginBottom: block.spacing.marginBottom,
            textAlign: block.data.align,
          }}
          onClick={onSelect}
        >
          {canEdit ? (
            <>
              <InlineTextarea
                value={block.data.title}
                className="news-intro-title-edit"
                rows={2}
                onChange={(title) => onChange({ ...block, data: { ...block.data, title } })}
              />
              <InlineTextarea
                value={block.data.subtitle}
                className="news-intro-subtitle-edit"
                rows={2}
                onChange={(subtitle) => onChange({ ...block, data: { ...block.data, subtitle } })}
              />
            </>
          ) : (
            <>
              <h2>{block.data.title}</h2>
              <p className="news-intro-subtitle">{block.data.subtitle}</p>
            </>
          )}
          <RichTextEditor
            value={block.data.leadHtml}
            align={block.data.align}
            paragraphGap={12}
            readOnly={!canEdit}
            onAlignChange={(align) => onChange({ ...block, data: { ...block.data, align } })}
            onChange={(leadHtml) => onChange({ ...block, data: { ...block.data, leadHtml } })}
          />
        </section>
      )

    case 'richText':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{
            marginTop: block.spacing.marginTop,
            marginBottom: block.spacing.marginBottom,
            textAlign: block.data.align,
            fontSize: block.data.fontSize,
          }}
          onClick={onSelect}
        >
          <RichTextEditor
            value={block.data.html}
            align={block.data.align}
            paragraphGap={block.data.paragraphGap}
            readOnly={!canEdit}
            onAlignChange={(align) => onChange({ ...block, data: { ...block.data, align } })}
            onChange={(html) => onChange({ ...block, data: { ...block.data, html } })}
          />
        </section>
      )

    case 'callout':
      return (
        <aside
          className={`content-block callout tone-${block.data.tone} ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          {canEdit ? (
            <>
              <InlineInput
                value={block.data.title}
                className="block-title-edit"
                onChange={(title) => onChange({ ...block, data: { ...block.data, title } })}
              />
              <InlineTextarea
                value={block.data.content}
                className="block-text-edit"
                rows={3}
                onChange={(content) => onChange({ ...block, data: { ...block.data, content } })}
              />
            </>
          ) : (
            <>
              <h3>{block.data.title}</h3>
              <p>{block.data.content}</p>
            </>
          )}
        </aside>
      )

    case 'important':
      return (
        <aside
          className={`content-block important-block ${selected ? 'is-selected' : ''}`}
          style={{
            marginTop: block.spacing.marginTop,
            marginBottom: block.spacing.marginBottom,
            borderColor: block.data.borderColor || block.data.accentColor || '#f7c476',
            background: hexToRgba(block.data.accentColor || '#f7c476', 0.22),
            borderRadius: `${block.data.radius ?? 14}px`,
          }}
          onClick={onSelect}
        >
          {canEdit ? (
            <>
              <InlineInput
                value={block.data.title}
                className="block-title-edit"
                onChange={(title) => onChange({ ...block, data: { ...block.data, title } })}
              />
              <InlineTextarea
                value={block.data.content}
                className="block-text-edit"
                rows={3}
                onChange={(content) => onChange({ ...block, data: { ...block.data, content } })}
              />
            </>
          ) : (
            <>
              <h3>{block.data.title}</h3>
              <p>{block.data.content}</p>
            </>
          )}
        </aside>
      )

    case 'quote':
      return (
        <blockquote
          className={`content-block quote-block ${selected ? 'is-selected' : ''}`}
          style={{
            marginTop: block.spacing.marginTop,
            marginBottom: block.spacing.marginBottom,
            borderLeftColor: block.data.accentColor || '#1e67dc',
            width: `${Math.max(40, Math.min(100, block.data.width || 100))}%`,
            minHeight: `${Math.max(0, block.data.minHeight || 0)}px`,
          }}
          onClick={onSelect}
        >
          {canEdit ? (
            <>
              <RichTextEditor
                value={getQuoteHtml(block.data)}
                align="left"
                paragraphGap={10}
                readOnly={!canEdit}
                requireSelectionForToolbarActions
                onChange={(html) =>
                  onChange({
                    ...block,
                    data: {
                      ...block.data,
                      html,
                      quote: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                    },
                  })
                }
              />
              <div className="quote-footer-editor">
                <RichTextEditor
                  value={getQuoteFooterHtml(block.data)}
                  align="left"
                  paragraphGap={6}
                  readOnly={!canEdit}
                  requireSelectionForToolbarActions
                  onChange={(footerHtml) =>
                    onChange({
                      ...block,
                      data: {
                        ...block.data,
                        footerHtml,
                      },
                    })
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div
                className="quote-richtext rich-text"
                dangerouslySetInnerHTML={{ __html: getQuoteHtml(block.data) }}
              />
              <div
                className="quote-footer-richtext rich-text"
                dangerouslySetInnerHTML={{ __html: getQuoteFooterHtml(block.data) }}
              />
            </>
          )}
        </blockquote>
      )

    case 'background':
      return (
        <section
          className={`content-block background-block ${selected ? 'is-selected' : ''}`}
          style={{
            marginTop: block.spacing.marginTop,
            marginBottom: block.spacing.marginBottom,
            background: block.data.background,
            color: block.data.textColor,
          }}
          onClick={onSelect}
        >
          {canEdit ? (
            <InlineInput
              value={block.data.title}
              className="block-title-edit"
              style={{ color: block.data.textColor }}
              onChange={(title) => onChange({ ...block, data: { ...block.data, title } })}
            />
          ) : (
            <h3>{block.data.title}</h3>
          )}
          <RichTextEditor
            value={block.data.contentHtml}
            align="left"
            paragraphGap={12}
            readOnly={!canEdit}
            onChange={(contentHtml) => onChange({ ...block, data: { ...block.data, contentHtml } })}
          />
        </section>
      )

    case 'divider':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div className={`divider divider-${block.data.style}`}>
            <span style={{ borderColor: block.data.color }} />
            {canEdit ? (
              <InlineInput
                value={block.data.label}
                className="divider-label-edit"
                placeholder="Подпись разделителя"
                onChange={(label) => onChange({ ...block, data: { ...block.data, label } })}
              />
            ) : (
              block.data.label && <strong>{block.data.label}</strong>
            )}
            <span style={{ borderColor: block.data.color }} />
          </div>
        </section>
      )

    case 'button':
      const buttonStyle = resolveButtonStyle(block.data)
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div className="button-row" style={{ justifyContent: alignMap[block.data.align] }}>
            {canEdit ? (
              <div
                className="action-button"
                style={{
                  background: buttonStyle.backgroundColor,
                  color: buttonStyle.textColor,
                  border: `${buttonStyle.borderWidth}px solid ${buttonStyle.borderColor}`,
                  borderRadius: buttonStyle.radius,
                  fontSize: buttonStyle.fontSize,
                  padding: `${buttonStyle.paddingY}px ${buttonStyle.paddingX}px`,
                }}
              >
                <InlineInput
                  value={block.data.label}
                  className="button-label-edit"
                  onChange={(label) => onChange({ ...block, data: { ...block.data, label } })}
                />
              </div>
            ) : (
              <a
                className="action-button"
                href={block.data.url}
                style={{
                  background: buttonStyle.backgroundColor,
                  color: buttonStyle.textColor,
                  border: `${buttonStyle.borderWidth}px solid ${buttonStyle.borderColor}`,
                  borderRadius: buttonStyle.radius,
                  fontSize: buttonStyle.fontSize,
                  padding: `${buttonStyle.paddingY}px ${buttonStyle.paddingX}px`,
                }}
              >
                {block.data.label}
              </a>
            )}
          </div>
        </section>
      )

    case 'table':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div className="table-editor">
            {canEdit ? (
              <InlineInput
                value={block.data.caption}
                className="table-caption-edit"
                placeholder="Подпись таблицы"
                onChange={(caption) => onChange({ ...block, data: { ...block.data, caption } })}
              />
            ) : (
              block.data.caption && <p className="table-caption">{block.data.caption}</p>
            )}
            <table>
              <thead>
                <tr>
                  {block.data.headers.map((h, i) => (
                    <th key={i}>
                      {canEdit ? (
                        <InlineInput
                          value={h}
                          className="table-cell-edit table-header-edit"
                          onChange={(value) => {
                            const headers = [...block.data.headers]
                            headers[i] = value
                            onChange({ ...block, data: { ...block.data, headers } })
                          }}
                        />
                      ) : (
                        h
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.data.rows.map((row, rowIndex) => (
                  <tr key={`${block.id}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${rowIndex}-${cellIndex}`}>
                        {canEdit ? (
                          <InlineInput
                            value={cell}
                            className="table-cell-edit"
                            onChange={(value) => {
                              const rows = block.data.rows.map((currentRow) => [...currentRow])
                              rows[rowIndex][cellIndex] = value
                              onChange({ ...block, data: { ...block.data, rows } })
                            }}
                          />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )

    case 'columns':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div
            className="columns-grid"
            style={{
              ['--column-width' as string]: `${block.data.columnWidth}px`,
              ['--column-height' as string]:
                block.data.columnHeight > 0 ? `${block.data.columnHeight}px` : 'auto',
            }}
          >
            {block.data.columns.slice(0, block.data.count).map((item, index) => (
              <article key={`${block.id}-${index}`} className="column-item">
                {canEdit ? (
                  <div className="column-editor-shell">
                    <RichTextEditor
                      value={item.html}
                      align="left"
                      paragraphGap={10}
                      readOnly={!canEdit}
                      requireSelectionForToolbarActions
                      onChange={(html) => {
                        const columns = [...block.data.columns]
                        columns[index] = { ...columns[index], html }
                        onChange({ ...block, data: { ...block.data, columns } })
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="column-richtext rich-text"
                    dangerouslySetInnerHTML={{ __html: item.html }}
                  />
                )}
              </article>
            ))}
          </div>
        </section>
      )

    case 'cards':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div className={`cards-grid cols-${block.data.columns}`}>
            {block.data.cards.map((item, index) => (
              <article key={`${block.id}-${index}`} className="card-item">
                {canEdit ? (
                  <div className="card-editor-shell">
                    <RichTextEditor
                      value={getCardHtml(item, index)}
                      align="left"
                      paragraphGap={10}
                      readOnly={!canEdit}
                      requireSelectionForToolbarActions
                      onChange={(html) => {
                        const cards = [...block.data.cards]
                        cards[index] = { ...cards[index], html }
                        onChange({ ...block, data: { ...block.data, cards } })
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className="card-richtext rich-text"
                      dangerouslySetInnerHTML={{ __html: getCardHtml(item, index) }}
                    />
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      )

    case 'image':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          {(() => {
            const hasText = hasMeaningfulHtml(block.data.textHtml)

            return (
          <div className={`image-layout-shell image-${block.data.align}`}>
            <div
              className={`image-layout image-side-${block.data.imageSide || 'left'} ${hasText ? 'has-text' : 'no-text'}`}
              style={{
                ['--image-column-width' as string]: `${Math.max(20, Math.min(100, block.data.width))}%`,
              }}
            >
              <figure className="image-wrap">
                {block.data.src ? (
                  <img
                    src={block.data.src}
                    alt={block.data.alt}
                    style={{
                      borderRadius: block.data.radius,
                      boxShadow: block.data.shadow ? '0 14px 30px rgba(15,23,42,0.16)' : 'none',
                      padding: block.data.withPadding ? 10 : 0,
                      background: block.data.withPadding ? '#fff' : 'transparent',
                    }}
                  />
                ) : (
                  <div className="image-placeholder">Добавьте изображение</div>
                )}
                {canEdit ? (
                  <InlineInput
                    value={block.data.caption}
                    className="image-caption-edit"
                    placeholder="Подпись к изображению"
                    onChange={(caption) => onChange({ ...block, data: { ...block.data, caption } })}
                  />
                ) : (
                  block.data.caption && <figcaption>{block.data.caption}</figcaption>
                )}
              </figure>

              {hasText ? (
                <div className="image-copy">
                  {canEdit ? (
                    <div className="image-editor-shell">
                      <RichTextEditor
                        value={block.data.textHtml}
                        align="left"
                        paragraphGap={10}
                        readOnly={!canEdit}
                        requireSelectionForToolbarActions
                        onChange={(textHtml) => onChange({ ...block, data: { ...block.data, textHtml } })}
                      />
                    </div>
                  ) : (
                    <div
                      className="image-copy-richtext rich-text"
                      dangerouslySetInnerHTML={{ __html: block.data.textHtml }}
                    />
                  )}
                </div>
              ) : canEdit ? (
                <div className="image-copy image-copy-empty">
                  <button
                    type="button"
                    className="settings-action-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onChange({
                        ...block,
                        data: {
                          ...block.data,
                          textHtml: '<p>Новый текст рядом с изображением.</p>',
                        },
                      })
                    }}
                  >
                    Добавить текст
                  </button>
                </div>
              ) : null}
            </div>
          </div>
            )
          })()}
        </section>
      )

    case 'stats':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          {canEdit ? (
            <InlineInput
              value={block.data.title}
              className="block-title-edit"
              onChange={(title) => onChange({ ...block, data: { ...block.data, title } })}
            />
          ) : (
            <h3>{block.data.title}</h3>
          )}
          <div className="stats-grid">
            {block.data.items.map((item, index) => (
              <article key={`${block.id}-${index}`} className="stat-card">
                {canEdit ? (
                  <>
                    <InlineInput
                      value={item.value}
                      className="stat-value-edit"
                      onChange={(value) => {
                        const items = [...block.data.items]
                        items[index] = { ...items[index], value }
                        onChange({ ...block, data: { ...block.data, items } })
                      }}
                    />
                    <InlineInput
                      value={item.label}
                      className="stat-label-edit"
                      onChange={(label) => {
                        const items = [...block.data.items]
                        items[index] = { ...items[index], label }
                        onChange({ ...block, data: { ...block.data, items } })
                      }}
                    />
                    <InlineTextarea
                      value={item.description}
                      className="stat-description-edit"
                      rows={3}
                      onChange={(description) => {
                        const items = [...block.data.items]
                        items[index] = { ...items[index], description }
                        onChange({ ...block, data: { ...block.data, items } })
                      }}
                    />
                  </>
                ) : (
                  <>
                    <p className="stat-value">{item.value}</p>
                    <p className="stat-label">{item.label}</p>
                    <p className="stat-description">{item.description}</p>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      )

    case 'chart': {
      const chartBlock = block as Extract<ArticleBlock, { type: 'chart' }>
      const max = getChartMax(block.data)
      const hasImportedChartImage = Boolean(block.data.imageSrc)
      const chartAlign = block.data.align || 'left'
      const showValues = block.data.showValues ?? true
      const hasChartSideText = hasMeaningfulHtml(block.data.textHtml)
      return (
        <section
          className={`content-block chart-block-shell ${block.data.frameEnabled === false ? 'chart-frame-off' : ''} ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div className="chart-head">
            {canEdit ? (
              <div className="chart-editor-shell">
                <div className="chart-text-toolbar-row">
                  <label className="chart-import-inline">
                    Импорт файла
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.svg,.png,.jpg,.jpeg,.webp"
                      onClick={(event) => event.stopPropagation()}
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) {
                          return
                        }

                        try {
                          await applyImportedChartFile(file, chartBlock, onChange)
                        } finally {
                          event.target.value = ''
                        }
                      }}
                    />
                  </label>
                </div>

                <RichTextEditor
                  value={getChartCombinedHtml(block.data)}
                  align="left"
                  paragraphGap={8}
                  readOnly={!canEdit}
                  requireSelectionForToolbarActions
                  onChange={(html) => {
                    const parsed = parseChartTextHtml(html)
                    onChange({
                      ...block,
                      data: {
                        ...block.data,
                        title: parsed.title,
                        titleHtml: parsed.titleHtml,
                        description: parsed.description,
                        descriptionHtml: parsed.descriptionHtml,
                      },
                    })
                  }}
                />
              </div>
            ) : (
              <>
                <div
                  className="chart-title-richtext rich-text"
                  dangerouslySetInnerHTML={{ __html: getChartTitleHtml(block.data) }}
                />
                <div
                  className="chart-description-richtext rich-text"
                  dangerouslySetInnerHTML={{ __html: getChartDescriptionHtml(block.data) }}
                />
              </>
            )}
          </div>
          {false && (
            <div className="chart-text-toolbar-row chart-import-toolbar-only">
              <label className="chart-import-inline">
                Импорт файла
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.svg,.png,.jpg,.jpeg,.webp"
                  onClick={(event) => event.stopPropagation()}
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) {
                      return
                    }

                    try {
                      await applyImportedChartFile(file, chartBlock, onChange)
                    } finally {
                      event.target.value = ''
                    }
                  }}
                />
              </label>
            </div>
          )}
          {hasImportedChartImage ? (
            <div className={`chart-import-shell chart-import-shell-${chartAlign}`}>
              <div
                className={`chart-image-layout chart-image-side-${block.data.imageTextSide || 'right'} ${hasChartSideText ? 'has-text' : 'no-text'}`}
              >
                <div
                  className="chart-image-wrap"
                  style={{ width: `${Math.max(30, Math.min(100, block.data.imageWidth || 100))}%` }}
                >
              <img
                className="chart-imported-image"
                src={block.data.imageSrc}
                alt={block.data.imageAlt || block.data.title || 'Диаграмма'}
              />
            </div>
                {hasChartSideText ? (
                  <div className="chart-copy">
                    {canEdit ? (
                      <div className="chart-copy-editor-shell">
                        <RichTextEditor
                          value={getChartSideTextHtml(block.data)}
                          align="left"
                          paragraphGap={10}
                          readOnly={!canEdit}
                          requireSelectionForToolbarActions
                          onChange={(textHtml) =>
                            onChange({
                              ...chartBlock,
                              data: {
                                ...chartBlock.data,
                                textHtml,
                              },
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div
                        className="chart-copy-richtext rich-text"
                        dangerouslySetInnerHTML={{ __html: block.data.textHtml || '' }}
                      />
                    )}
                  </div>
                ) : canEdit ? (
                  <div className="chart-copy chart-copy-empty">
                    <button
                      type="button"
                      className="settings-action-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onChange({
                          ...chartBlock,
                          data: {
                            ...chartBlock.data,
                            textHtml: '<p>Новый текст рядом с диаграммой.</p>',
                          },
                        })
                      }}
                    >
                      Добавить текст
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
          <div className={`chart-import-shell chart-import-shell-${chartAlign}`}>
          <div className="chart-grid">
            {block.data.items.map((item, index) => {
              const inputKey = `${block.id}-${index}`
              return (
                <div key={inputKey} className={`chart-row ${canEdit ? 'is-editable' : ''}`}>
                  {canEdit ? (
                    <>
                      <input
                        className="chart-label-input"
                        value={item.label}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const items = [...block.data.items]
                          items[index] = { ...items[index], label: event.target.value }
                              onChange({ ...chartBlock, data: { ...chartBlock.data, items } })
                        }}
                      />
                      <div className="chart-line">
                        <button
                          type="button"
                          className="chart-fill-button"
                          style={{
                            width: `${Math.max(0, Math.min(100, (item.value / max) * 100))}%`,
                            background: item.color,
                          }}
                          onClick={(event) => {
                            event.stopPropagation()
                            chartColorInputsRef.current[inputKey]?.click()
                          }}
                        />
                        <input
                          ref={(node) => {
                            chartColorInputsRef.current[inputKey] = node
                          }}
                          className="chart-color-input-hidden"
                          type="color"
                          value={item.color}
                          onChange={(event) => {
                                const items = [...chartBlock.data.items]
                                items[index] = { ...items[index], color: event.target.value }
                                onChange({ ...chartBlock, data: { ...chartBlock.data, items } })
                          }}
                        />
                      </div>
                      <input
                        className="chart-value-input"
                        type="number"
                        value={item.value}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                              const items = [...chartBlock.data.items]
                              items[index] = { ...items[index], value: Number(event.target.value) || 0 }
                              onChange({ ...chartBlock, data: { ...chartBlock.data, items } })
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <span>{item.label}</span>
                      <div className="chart-line">
                        <div
                          className="chart-line-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, (item.value / max) * 100))}%`,
                            background: item.color,
                          }}
                        />
                      </div>
                      <span>{showValues ? item.value : ''}</span>
                    </>
                  )}
                </div>
                )
              })}
          </div>
          </div>
          )}
        </section>
      )
    }

    default:
      return null
  }
}
