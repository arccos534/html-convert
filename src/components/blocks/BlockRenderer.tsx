import { sanitizeHtml } from '../../lib/sanitizeHtml'
import type { ArticleBlock } from '../../types'
import { ChartBlockEditor } from './ChartBlockEditor'
import { buildHeroBackground, getHeroTextColor } from '../../lib/heroBackground'
import { resolveButtonStyle } from '../../lib/buttonStyle'
import { ImageBlockEditor } from './ImageBlockEditor'
import { RichTextEditor } from './RichTextEditor'

interface BlockRendererProps {
  block: ArticleBlock
  selected: boolean
  editable: boolean
  onSelect: () => void
  onChange: (block: ArticleBlock) => void
  onImportChart: (blockId: string, file: File) => Promise<void>
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

const stopInlineEvent = (event: React.MouseEvent | React.FocusEvent) => {
  event.stopPropagation()
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
  onImportChart,
}: BlockRendererProps) => {
  const canEdit = editable && selected

  switch (block.type) {
    case 'hero':
      return (
        <section
          className={`content-block hero-block ${block.data.backgroundEnabled ? '' : 'hero-unfilled'} ${selected ? 'is-selected' : ''}`}
          style={{
            marginTop: block.spacing.marginTop,
            marginBottom: block.spacing.marginBottom,
            background: block.data.backgroundEnabled ? buildHeroBackground(block.data) : undefined,
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
                  trailingParagraph={false}
                  readOnly={!canEdit}
                  requireSelectionForToolbarActions
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
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(getHeroTitleHtml(block.data)) }}
              />
              <div
                className="hero-richtext hero-subtitle-richtext"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(getHeroSubtitleHtml(block.data)) }}
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
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(getQuoteHtml(block.data)) }}
              />
              <div
                className="quote-footer-richtext rich-text"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(getQuoteFooterHtml(block.data)) }}
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

    case 'button': {
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

    }
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
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.html) }}
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
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(getCardHtml(item, index)) }}
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
        <ImageBlockEditor
          block={block}
          selected={selected}
          editable={editable}
          onSelect={onSelect}
          onChange={onChange}
        />
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

    case 'chart':
      return <ChartBlockEditor block={block} selected={selected} editable={editable} onSelect={onSelect} onChange={onChange} onImportChart={onImportChart} />

    default:
      return null
  }
}
