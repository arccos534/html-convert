import { useRef, useState } from 'react'
import type { ArticleBlock } from '../../types'
import { buildHeroBackground } from '../../lib/heroBackground'
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

const getChartCombinedHtml = (data: {
  titleHtml?: string
  title: string
  descriptionHtml?: string
  description: string
}) => `${getChartTitleHtml(data)}${getChartDescriptionHtml(data)}`

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
  importSource?: 'manual' | 'excel' | 'image'
  autoMax?: boolean
  items: Array<{ value: number }>
}) =>
  data.importSource === 'excel'
    ? Math.max(1, ...data.items.map((item) => item.value))
    : Math.max(1, data.max, ...data.items.map((item) => item.value))

export const BlockRenderer = ({
  block,
  selected,
  editable,
  onSelect,
  onChange,
}: BlockRendererProps) => {
  const canEdit = editable && selected
  const [openColumnToolbars, setOpenColumnToolbars] = useState<Record<string, boolean>>({})
  const [openCardToolbars, setOpenCardToolbars] = useState<Record<string, boolean>>({})
  const [openQuoteToolbars, setOpenQuoteToolbars] = useState<Record<string, boolean>>({})
  const [openChartToolbars, setOpenChartToolbars] = useState<Record<string, boolean>>({})
  const [openImageToolbars, setOpenImageToolbars] = useState<Record<string, boolean>>({})
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
            color: block.data.textColor,
            textAlign: block.data.align,
          }}
          onClick={onSelect}
        >
          <h1>{block.data.title}</h1>
          <p className="hero-subtitle">{block.data.subtitle}</p>
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
          <h2>{block.data.title}</h2>
          <p className="news-intro-subtitle">{block.data.subtitle}</p>
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
          <h3>{block.data.title}</h3>
          <p>{block.data.content}</p>
        </aside>
      )

    case 'important':
      return (
        <aside
          className={`content-block important-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <h3>{block.data.title}</h3>
          <p>{block.data.content}</p>
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
              <div className="quote-block-header">
                <div className="column-item-spacer" />
                <button
                  type="button"
                  className={`column-tools-toggle ${openQuoteToolbars[block.id] ? 'is-active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpenQuoteToolbars((prev) => ({
                      ...prev,
                      [block.id]: !prev[block.id],
                    }))
                  }}
                >
                  ...
                </button>
              </div>
              <RichTextEditor
                value={getQuoteHtml(block.data)}
                align="left"
                paragraphGap={10}
                readOnly={!canEdit}
                showToolbar={Boolean(openQuoteToolbars[block.id])}
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
                  showToolbar={Boolean(openQuoteToolbars[block.id])}
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
          <h3>{block.data.title}</h3>
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
            {block.data.label && <strong>{block.data.label}</strong>}
            <span style={{ borderColor: block.data.color }} />
          </div>
        </section>
      )

    case 'button':
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div className="button-row" style={{ justifyContent: alignMap[block.data.align] }}>
            <a className={`action-button btn-${block.data.variant}`} href={block.data.url}>
              {block.data.label}
            </a>
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
            {block.data.caption && <p className="table-caption">{block.data.caption}</p>}
            <table>
              <thead>
                <tr>{block.data.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {block.data.rows.map((row, rowIndex) => (
                  <tr key={`${block.id}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
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
                  <>
                    <div className="column-item-header">
                      <div className="column-item-spacer" />
                      <button
                        type="button"
                        className={`column-tools-toggle ${openColumnToolbars[`${block.id}-${index}`] ? 'is-active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenColumnToolbars((prev) => ({
                            ...prev,
                            [`${block.id}-${index}`]: !prev[`${block.id}-${index}`],
                          }))
                        }}
                      >
                        ...
                      </button>
                    </div>
                    <RichTextEditor
                      value={item.html}
                      align="left"
                      paragraphGap={10}
                      readOnly={!canEdit}
                      showToolbar={Boolean(openColumnToolbars[`${block.id}-${index}`])}
                      requireSelectionForToolbarActions
                      onChange={(html) => {
                        const columns = [...block.data.columns]
                        columns[index] = { ...columns[index], html }
                        onChange({ ...block, data: { ...block.data, columns } })
                      }}
                    />
                  </>
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
                  <>
                    <div className="card-item-header">
                      <div className="column-item-spacer" />
                      <button
                        type="button"
                        className={`column-tools-toggle ${openCardToolbars[`${block.id}-${index}`] ? 'is-active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenCardToolbars((prev) => ({
                            ...prev,
                            [`${block.id}-${index}`]: !prev[`${block.id}-${index}`],
                          }))
                        }}
                      >
                        ...
                      </button>
                    </div>
                    <RichTextEditor
                      value={getCardHtml(item, index)}
                      align="left"
                      paragraphGap={10}
                      readOnly={!canEdit}
                      showToolbar={Boolean(openCardToolbars[`${block.id}-${index}`])}
                      requireSelectionForToolbarActions
                      onChange={(html) => {
                        const cards = [...block.data.cards]
                        cards[index] = { ...cards[index], html }
                        onChange({ ...block, data: { ...block.data, cards } })
                      }}
                    />
                  </>
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
                {block.data.caption && <figcaption>{block.data.caption}</figcaption>}
              </figure>

              {hasText ? (
                <div className="image-copy">
                  {canEdit ? (
                    <>
                      <div className="image-copy-header">
                        <div className="column-item-spacer" />
                        <button
                          type="button"
                          className={`column-tools-toggle ${openImageToolbars[block.id] ? 'is-active' : ''}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            setOpenImageToolbars((prev) => ({
                              ...prev,
                              [block.id]: !prev[block.id],
                            }))
                          }}
                        >
                          ...
                        </button>
                      </div>
                      <RichTextEditor
                        value={block.data.textHtml}
                        align="left"
                        paragraphGap={10}
                        readOnly={!canEdit}
                        showToolbar={Boolean(openImageToolbars[block.id])}
                        requireSelectionForToolbarActions
                        onChange={(textHtml) => onChange({ ...block, data: { ...block.data, textHtml } })}
                      />
                    </>
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
          <h3>{block.data.title}</h3>
          <div className="stats-grid">
            {block.data.items.map((item, index) => (
              <article key={`${block.id}-${index}`} className="stat-card">
                <p className="stat-value">{item.value}</p>
                <p className="stat-label">{item.label}</p>
                <p className="stat-description">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      )

    case 'chart': {
      const max = getChartMax(block.data)
      const hasImportedChartImage = Boolean(block.data.imageSrc)
      const chartAlign = block.data.align || 'left'
      const showValues = block.data.showValues ?? true
      return (
        <section
          className={`content-block ${selected ? 'is-selected' : ''}`}
          style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }}
          onClick={onSelect}
        >
          <div className="chart-head">
            {canEdit ? (
              <>
                <div className="chart-text-toolbar-row">
                  <div className="column-item-spacer" />
                  <button
                    type="button"
                    className={`column-tools-toggle ${openChartToolbars[block.id] ? 'is-active' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenChartToolbars((prev) => ({
                        ...prev,
                        [block.id]: !prev[block.id],
                      }))
                    }}
                  >
                    ...
                  </button>
                </div>
                <RichTextEditor
                  value={getChartCombinedHtml(block.data)}
                  align="left"
                  paragraphGap={8}
                  readOnly={!canEdit}
                  showToolbar={Boolean(openChartToolbars[block.id])}
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
              </>
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
          {hasImportedChartImage ? (
            <div className={`chart-import-shell chart-import-shell-${chartAlign}`}>
            <div className="chart-image-wrap">
              <img
                className="chart-imported-image"
                src={block.data.imageSrc}
                alt={block.data.imageAlt || block.data.title || 'Диаграмма'}
              />
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
                          onChange({ ...block, data: { ...block.data, items } })
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
                            const items = [...block.data.items]
                            items[index] = { ...items[index], color: event.target.value }
                            onChange({ ...block, data: { ...block.data, items } })
                          }}
                        />
                      </div>
                      <input
                        className="chart-value-input"
                        type="number"
                        value={item.value}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const items = [...block.data.items]
                          items[index] = { ...items[index], value: Number(event.target.value) || 0 }
                          onChange({ ...block, data: { ...block.data, items } })
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
