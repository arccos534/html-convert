import { TableBlockEditor } from './TableBlockEditor'
import { StatsBlockEditor } from './StatsBlockEditor'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import type { ArticleBlock } from '../../types'
import { ChartBlockEditor } from './ChartBlockEditor'
import { buildHeroBackground, getHeroTextColor } from '../../lib/heroBackground'
import { resolveButtonStyle } from '../../lib/buttonStyle'
import { ImageBlockEditor } from './ImageBlockEditor'
import { RichTextEditor } from './RichTextEditor'
import { FormattedTextField } from './FormattedTextField'
import { getFormattedTextHtml } from '../../lib/formattedText'

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
              <div className="news-intro-title-edit"><FormattedTextField value={block.data.title} html={block.data.titleHtml} tag="h2" ariaLabel="Заголовок новости" readOnly={!canEdit}
                onChange={(title, titleHtml) => onChange({ ...block, data: { ...block.data, title, titleHtml } })} /></div>
              <div className="news-intro-subtitle-edit"><FormattedTextField value={block.data.subtitle} html={block.data.subtitleHtml} tag="p" ariaLabel="Подзаголовок новости" readOnly={!canEdit}
                onChange={(subtitle, subtitleHtml) => onChange({ ...block, data: { ...block.data, subtitle, subtitleHtml } })} /></div>
            </>
          ) : (
            <>
              <h2 dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.title, block.data.titleHtml, 'h2') }} />
              <div className="news-intro-subtitle" dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.subtitle, block.data.subtitleHtml, 'p') }} />
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
              <div className="block-title-edit"><FormattedTextField value={block.data.title} html={block.data.titleHtml} tag="h3" ariaLabel="Заголовок выноски" readOnly={!canEdit}
                onChange={(title, titleHtml) => onChange({ ...block, data: { ...block.data, title, titleHtml } })} /></div>
              <div className="block-text-edit"><FormattedTextField value={block.data.content} html={block.data.contentHtml} ariaLabel="Текст выноски" readOnly={!canEdit}
                onChange={(content, contentHtml) => onChange({ ...block, data: { ...block.data, content, contentHtml } })} /></div>
            </>
          ) : (
            <>
              <h3 dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.title, block.data.titleHtml, 'h3') }} />
              <div dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.content, block.data.contentHtml, 'p') }} />
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
              <div className="block-title-edit"><FormattedTextField value={block.data.title} html={block.data.titleHtml} tag="h3" ariaLabel="Заголовок важного блока" readOnly={!canEdit}
                onChange={(title, titleHtml) => onChange({ ...block, data: { ...block.data, title, titleHtml } })} /></div>
              <div className="block-text-edit"><FormattedTextField value={block.data.content} html={block.data.contentHtml} ariaLabel="Текст важного блока" readOnly={!canEdit}
                onChange={(content, contentHtml) => onChange({ ...block, data: { ...block.data, content, contentHtml } })} /></div>
            </>
          ) : (
            <>
              <h3 dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.title, block.data.titleHtml, 'h3') }} />
              <div dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.content, block.data.contentHtml, 'p') }} />
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
            <div className="block-title-edit" style={{ color: block.data.textColor }}><FormattedTextField value={block.data.title} html={block.data.titleHtml} tag="h3" ariaLabel="Заголовок блока с фоном" readOnly={!canEdit}
              onChange={(title, titleHtml) => onChange({ ...block, data: { ...block.data, title, titleHtml } })} /></div>
          ) : (
            <h3 dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.title, block.data.titleHtml, 'h3') }} />
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
              <div className="divider-label-edit"><FormattedTextField value={block.data.label} html={block.data.labelHtml} tag="span" ariaLabel="Подпись разделителя" readOnly={!canEdit}
                onChange={(label, labelHtml) => onChange({ ...block, data: { ...block.data, label, labelHtml } })} /></div>
            ) : (
              block.data.label && <strong dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.label, block.data.labelHtml, 'span') }} />
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
                <div className="button-label-edit"><FormattedTextField value={block.data.label} html={block.data.labelHtml} tag="span" ariaLabel="Текст кнопки" readOnly={!canEdit}
                  onChange={(label, labelHtml) => onChange({ ...block, data: { ...block.data, label, labelHtml } })} /></div>
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
                <span dangerouslySetInnerHTML={{ __html: getFormattedTextHtml(block.data.label, block.data.labelHtml, 'span') }} />
              </a>
            )}
          </div>
        </section>
      )

    }
    case 'table':
      return <div style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }} onClick={onSelect}>
        <TableBlockEditor block={block} editable={canEdit} onChange={onChange} />
      </div>

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
      return <div style={{ marginTop: block.spacing.marginTop, marginBottom: block.spacing.marginBottom }} onClick={onSelect}>
        <StatsBlockEditor block={block} editable={canEdit} onChange={onChange} />
      </div>

    case 'chart':
      return <ChartBlockEditor block={block} selected={selected} editable={editable} onSelect={onSelect} onChange={onChange} onImportChart={onImportChart} />

    default:
      return null
  }
}
