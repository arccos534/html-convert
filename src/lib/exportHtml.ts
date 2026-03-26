import type {
  ArticleBlock,
  ArticleDocument,
  ButtonData,
  ChartData,
  ColumnsData,
  DividerData,
  ImageData,
  SpacingSettings,
  TableData,
} from '../types'
import { buildColumnsStyle } from './columns'
import { buildHeroBackground, getHeroTextColor } from './heroBackground'
import { resolveButtonStyle } from './buttonStyle'

export const EXPORT_ROOT_CLASS = 'bitrix-news-builder-content'

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const escapeAttr = (value: string): string => escapeHtml(value)

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '').trim()
  const full =
    normalized.length === 3
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

const inlineSpacing = (spacing: SpacingSettings): string =>
  `margin-top:${spacing.marginTop}px;margin-bottom:${spacing.marginBottom}px;`

const getHeroTitleHtml = (data: { titleHtml?: string; title: string }) =>
  data.titleHtml || `<h1>${escapeHtml(data.title)}</h1>`

const getHeroSubtitleHtml = (data: { subtitleHtml?: string; subtitle: string }) =>
  data.subtitleHtml || `<p>${escapeHtml(data.subtitle)}</p>`

const alignToFlex = (align: 'left' | 'center' | 'right'): string => {
  if (align === 'center') {
    return 'center'
  }
  if (align === 'right') {
    return 'flex-end'
  }
  return 'flex-start'
}

const renderButton = (data: ButtonData) => {
  const buttonStyle = resolveButtonStyle(data)

  return `
    <div class="btn-row" style="justify-content:${alignToFlex(data.align)};">
      <a class="news-btn" href="${escapeAttr(data.url)}" target="_blank" rel="noreferrer noopener" style="background:${escapeAttr(buttonStyle.backgroundColor)};color:${escapeAttr(buttonStyle.textColor)};border:${buttonStyle.borderWidth}px solid ${escapeAttr(buttonStyle.borderColor)};border-radius:${buttonStyle.radius}px;font-size:${buttonStyle.fontSize}px;padding:${buttonStyle.paddingY}px ${buttonStyle.paddingX}px;">
        ${escapeHtml(data.label)}
      </a>
    </div>
  `
}

const renderDivider = (data: DividerData) => {
  const classByStyle: Record<DividerData['style'], string> = {
    solid: 'divider-solid',
    dashed: 'divider-dashed',
    thick: 'divider-thick',
  }

  const labelHtml = data.label
    ? `<span class="divider-label">${escapeHtml(data.label)}</span>`
    : ''

  return `
    <div class="divider-wrap ${classByStyle[data.style]}">
      <div class="divider-line" style="border-color:${escapeAttr(data.color)}"></div>
      ${labelHtml}
      <div class="divider-line" style="border-color:${escapeAttr(data.color)}"></div>
    </div>
  `
}

const renderTable = (data: TableData) => {
  const headerHtml = data.headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join('')

  const rowsHtml = data.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('')

  return `
    <div class="table-wrap">
      ${data.caption ? `<p class="table-caption">${escapeHtml(data.caption)}</p>` : ''}
      <table>
        <thead>
          <tr>${headerHtml}</tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `
}

const renderColumns = (data: ColumnsData) => {
  const columnsHtml = data.columns
    .slice(0, data.count)
    .map(
      (column) => `
      <article class="column-item">
        <div class="column-richtext rich-text">${column.html}</div>
      </article>
    `,
    )
    .join('')

  return `<section class="columns-grid" style="${escapeAttr(buildColumnsStyle(data.columnWidth, data.columnHeight))}">${columnsHtml}</section>`
}

const getCardHtml = (
  card: { html?: string; title?: string; content?: string; stat?: string },
  index: number,
) => {
  if (card.html) {
    return card.html
  }

  const stat = card.stat?.trim() || '+24%'
  const title = card.title?.trim() || `Карточка ${index + 1}`
  const content = card.content?.trim() || 'Добавьте текст карточки.'
  return `<p><span style="color:#1e67dc;font-size:22px;font-weight:700;">${escapeHtml(stat)}</span></p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(content)}</p>`
}

const getQuoteHtml = (data: { html?: string; quote: string }) =>
  data.html || `<p>${escapeHtml(data.quote)}</p>`

const getQuoteFooterHtml = (data: {
  footerHtml?: string
  author: string
  source: string
}) => data.footerHtml || `<p>${escapeHtml([data.author, data.source].filter(Boolean).join(', '))}</p>`

const hasMeaningfulHtml = (value?: string) =>
  Boolean(value && value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())

const getChartTitleHtml = (data: { titleHtml?: string; title: string }) =>
  data.titleHtml || `<h3>${escapeHtml(data.title)}</h3>`

const getChartDescriptionHtml = (data: { descriptionHtml?: string; description: string }) =>
  data.descriptionHtml || `<p>${escapeHtml(data.description)}</p>`

const getChartSideTextHtml = (data: { textHtml?: string }) => data.textHtml || ''

const getChartMax = (data: {
  max: number
  importSource?: 'manual' | 'excel' | 'excelVisual' | 'image'
  autoMax?: boolean
  items: Array<{ value: number }>
}) =>
  data.importSource === 'excel'
    ? Math.max(1, ...data.items.map((item) => item.value))
    : Math.max(1, data.max, ...data.items.map((item) => item.value))

const renderImage = (data: ImageData) => {
  const alignClass = `image-${data.align}`
  const sideClass = `image-side-${data.imageSide || 'left'}`
  const hasText = hasMeaningfulHtml(data.textHtml)
  const mediaHtml = data.src
    ? `
      <img
        src="${escapeAttr(data.src)}"
        alt="${escapeAttr(data.alt)}"
        style="border-radius:${Math.max(0, data.radius)}px;${data.shadow ? 'box-shadow:0 14px 30px rgba(15,23,42,.16);' : ''}${data.withPadding ? 'padding:12px;background:#fff;' : ''}"
      />
    `
    : '<div class="image-placeholder">Добавьте изображение</div>'

  return `
    <div class="image-layout-shell ${alignClass}">
      <div class="image-layout ${sideClass} ${hasText ? 'has-text' : 'no-text'}" style="--image-column-width:${Math.max(20, Math.min(100, data.width))}%;">
        <figure class="image-block">
          ${mediaHtml}
          ${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ''}
        </figure>
        ${hasText ? `<div class="image-copy-richtext rich-text">${data.textHtml || ''}</div>` : ''}
      </div>
    </div>
  `
}

const renderChart = (data: ChartData) => {
  if (data.imageSrc) {
    const chartAlign = data.align || 'left'
    const hasSideText = hasMeaningfulHtml(data.textHtml)
    return `
      <section class="chart-block ${data.frameEnabled === false ? 'chart-frame-off' : ''}">
        <header>
          <div class="chart-title-richtext rich-text">${getChartTitleHtml(data)}</div>
          ${getChartDescriptionHtml(data)}
        </header>
        <div class="chart-body">
          <div class="chart-import-shell chart-import-shell-${chartAlign}">
            <div class="chart-image-layout chart-image-side-${data.imageTextSide || 'right'} ${hasSideText ? 'has-text' : 'no-text'}">
              <div class="chart-image-wrap" style="width:${Math.max(30, Math.min(100, data.imageWidth || 100))}%;">
                <img class="chart-imported-image" src="${escapeAttr(data.imageSrc)}" alt="${escapeAttr(data.imageAlt || data.title || 'Диаграмма')}" />
              </div>
              ${hasSideText ? `<div class="chart-copy-richtext rich-text">${getChartSideTextHtml(data)}</div>` : ''}
            </div>
          </div>
        </div>
      </section>
    `
  }

  const maxValue = getChartMax(data)
  const showValues = data.showValues ?? true

  const rows = data.items
    .map((item) => {
      const percent = Math.max(0, Math.min(100, (item.value / maxValue) * 100))
      return `
        <div class="chart-row">
          <span class="chart-label">${escapeHtml(item.label)}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="width:${percent}%;background:${escapeAttr(item.color)}"></div>
          </div>
          <span class="chart-value">${showValues ? item.value : ''}</span>
        </div>
      `
    })
    .join('')

  return `
    <section class="chart-block ${data.frameEnabled === false ? 'chart-frame-off' : ''}">
      <header>
        <div class="chart-title-richtext rich-text">${getChartTitleHtml(data)}</div>
        ${getChartDescriptionHtml(data)}
      </header>
      <div class="chart-body">
        ${rows}
      </div>
    </section>
  `
}

const renderBlock = (block: ArticleBlock): string => {
  const style = inlineSpacing(block.spacing)

  switch (block.type) {
    case 'hero':
      return `
        <section class="news-block hero ${block.data.backgroundEnabled ? '' : 'hero-plain'}" style="${style}background:${escapeAttr(buildHeroBackground(block.data))};color:${escapeAttr(getHeroTextColor(block.data))};text-align:${block.data.align};">
          <div class="hero-richtext hero-title-richtext">${getHeroTitleHtml(block.data)}</div>
          <div class="hero-richtext hero-subtitle-richtext">${getHeroSubtitleHtml(block.data)}</div>
        </section>
      `
    case 'newsIntro':
      return `
        <section class="news-block news-intro" style="${style}text-align:${block.data.align};">
          <h2>${escapeHtml(block.data.title)}</h2>
          <p class="subtitle">${escapeHtml(block.data.subtitle)}</p>
          <div class="lead">${block.data.leadHtml}</div>
        </section>
      `
    case 'richText':
      return `
        <section class="news-block rich-text" style="${style}text-align:${block.data.align};font-size:${block.data.fontSize}px;--paragraph-gap:${block.data.paragraphGap}px;">
          ${block.data.html}
        </section>
      `
    case 'callout':
      return `
        <aside class="news-block callout tone-${block.data.tone}" style="${style}">
          <h3>${escapeHtml(block.data.title)}</h3>
          <p>${escapeHtml(block.data.content)}</p>
        </aside>
      `
    case 'important':
      return `
        <aside class="news-block important" style="${style}border-color:${escapeAttr(block.data.borderColor || block.data.accentColor || '#f7c476')};background:${escapeAttr(hexToRgba(block.data.accentColor || '#f7c476', 0.22))};border-radius:${Math.max(0, block.data.radius ?? 14)}px;">
          <h3>${escapeHtml(block.data.title)}</h3>
          <p>${escapeHtml(block.data.content)}</p>
        </aside>
      `
    case 'quote':
      return `
        <blockquote class="news-block quote" style="${style}border-left-color:${escapeAttr(block.data.accentColor || '#1e67dc')};width:${Math.max(40, Math.min(100, block.data.width || 100))}%;min-height:${Math.max(0, block.data.minHeight || 0)}px;">
          <div class="quote-richtext rich-text">${getQuoteHtml(block.data)}</div>
          <div class="quote-footer-richtext rich-text">${getQuoteFooterHtml(block.data)}</div>
        </blockquote>
      `
    case 'background':
      return `
        <section class="news-block bg-block" style="${style}background:${escapeAttr(block.data.background)};color:${escapeAttr(block.data.textColor)};">
          <h3>${escapeHtml(block.data.title)}</h3>
          <div>${block.data.contentHtml}</div>
        </section>
      `
    case 'divider':
      return `<section class="news-block" style="${style}">${renderDivider(block.data)}</section>`
    case 'button':
      return `<section class="news-block" style="${style}">${renderButton(block.data)}</section>`
    case 'table':
      return `<section class="news-block" style="${style}">${renderTable(block.data)}</section>`
    case 'columns':
      return `<section class="news-block" style="${style}">${renderColumns(block.data)}</section>`
    case 'cards':
      return `
        <section class="news-block cards-grid cols-${block.data.columns}" style="${style}">
          ${block.data.cards
            .map(
              (card, index) => `
            <article class="card-item">
              <div class="card-richtext rich-text">${getCardHtml(card, index)}</div>
            </article>
          `,
            )
            .join('')}
        </section>
      `
    case 'image':
      return `<section class="news-block" style="${style}">${renderImage(block.data)}</section>`
    case 'stats':
      return `
        <section class="news-block stats-block" style="${style}">
          <h3>${escapeHtml(block.data.title)}</h3>
          <div class="stats-grid">
            ${block.data.items
              .map(
                (item) => `
              <article class="stats-item">
                <p class="stats-value">${escapeHtml(item.value)}</p>
                <p class="stats-label">${escapeHtml(item.label)}</p>
                <p class="stats-description">${escapeHtml(item.description)}</p>
              </article>
            `,
              )
              .join('')}
          </div>
        </section>
      `
    case 'chart':
      return `<section class="news-block" style="${style}">${renderChart(block.data)}</section>`
    default:
      return ''
  }
}

export const exportCss = `
  .${EXPORT_ROOT_CLASS} {
    --text: #172033;
    --muted: #526078;
    --line: #d9e2f1;
    --surface: #ffffff;
    --bg: #f5f8ff;
    --brand: #1864f2;
    --paragraph-gap: 14px;
    color: var(--text);
    font-family: "Open Sans", "Helvetica Neue", Arial, sans-serif;
    line-height: 1.55;
  }

  .${EXPORT_ROOT_CLASS},
  .${EXPORT_ROOT_CLASS} * {
    box-sizing: border-box;
  }

  .${EXPORT_ROOT_CLASS} a {
    color: var(--brand);
  }

  .${EXPORT_ROOT_CLASS} .news-page {
    max-width: var(--page-width, 980px);
    margin: 24px auto;
    background: var(--surface);
    border-radius: 22px;
    box-shadow: 0 14px 42px rgba(15, 23, 42, 0.08);
    padding: 26px;
  }

  .${EXPORT_ROOT_CLASS} .news-block {
    width: 100%;
  }

  .${EXPORT_ROOT_CLASS} .hero {
    border-radius: 18px;
    padding: 34px;
    background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
    color: #fff;
  }

  .${EXPORT_ROOT_CLASS} .hero.hero-plain {
    padding: 0;
    border-radius: 0;
    background: transparent !important;
  }

  .${EXPORT_ROOT_CLASS} .hero h1 {
    margin: 0 0 14px;
    font-size: clamp(30px, 5vw, 46px);
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .${EXPORT_ROOT_CLASS} .hero p {
    margin: 0;
  }

  .${EXPORT_ROOT_CLASS} .hero-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.82;
    font-size: 12px;
    margin-bottom: 14px;
  }

  .${EXPORT_ROOT_CLASS} .hero-subtitle {
    font-size: 18px;
    opacity: 0.95;
    max-width: 840px;
    margin-bottom: 20px;
  }

  .${EXPORT_ROOT_CLASS} .hero-date {
    font-size: 14px;
    opacity: 0.78;
  }

  .${EXPORT_ROOT_CLASS} .news-intro h2 {
    margin: 0;
    font-size: clamp(30px, 4vw, 40px);
    letter-spacing: -0.02em;
  }

  .${EXPORT_ROOT_CLASS} .news-intro .subtitle {
    margin: 10px 0 14px;
    color: var(--muted);
    font-size: 20px;
  }

  .${EXPORT_ROOT_CLASS} .news-intro .lead {
    font-size: 18px;
  }

  .${EXPORT_ROOT_CLASS} .rich-text p,
  .${EXPORT_ROOT_CLASS} .rich-text ul,
  .${EXPORT_ROOT_CLASS} .rich-text ol,
  .${EXPORT_ROOT_CLASS} .rich-text blockquote,
  .${EXPORT_ROOT_CLASS} .rich-text h1,
  .${EXPORT_ROOT_CLASS} .rich-text h2,
  .${EXPORT_ROOT_CLASS} .rich-text h3 {
    margin: 0 0 var(--paragraph-gap);
  }

  .${EXPORT_ROOT_CLASS} .callout,
  .${EXPORT_ROOT_CLASS} .important,
  .${EXPORT_ROOT_CLASS} .bg-block,
  .${EXPORT_ROOT_CLASS} .quote {
    border-radius: 16px;
    padding: 18px 20px;
  }

  .${EXPORT_ROOT_CLASS} .callout h3,
  .${EXPORT_ROOT_CLASS} .important h3,
  .${EXPORT_ROOT_CLASS} .bg-block h3 {
    margin: 0 0 8px;
  }

  .${EXPORT_ROOT_CLASS} .callout p,
  .${EXPORT_ROOT_CLASS} .important p,
  .${EXPORT_ROOT_CLASS} .bg-block p {
    margin: 0;
  }

  .${EXPORT_ROOT_CLASS} .tone-info {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
  }

  .${EXPORT_ROOT_CLASS} .tone-success {
    background: #ecfdf5;
    border: 1px solid #86efac;
  }

  .${EXPORT_ROOT_CLASS} .tone-warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
  }

  .${EXPORT_ROOT_CLASS} .tone-danger {
    background: #fef2f2;
    border: 1px solid #fca5a5;
  }

  .${EXPORT_ROOT_CLASS} .important {
    background: #fff7ed;
    border: 1px solid #fdba74;
  }

  .${EXPORT_ROOT_CLASS} .quote {
    border-left: 4px solid var(--brand);
    background: #f8fbff;
    margin-inline: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .${EXPORT_ROOT_CLASS} .quote p {
    margin: 0 0 8px;
    font-size: 20px;
    line-height: 1.45;
  }

  .${EXPORT_ROOT_CLASS} .quote-footer-richtext {
    color: var(--muted);
    font-size: 14px;
    margin-top: 10px;
  }

  .${EXPORT_ROOT_CLASS} .quote-footer-richtext p,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext ul,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext ol,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext blockquote,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext h1,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext h2,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext h3 {
    margin: 0 0 6px;
  }

  .${EXPORT_ROOT_CLASS} .quote-footer-richtext p:last-child,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext ul:last-child,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext ol:last-child,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext blockquote:last-child,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext h1:last-child,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext h2:last-child,
  .${EXPORT_ROOT_CLASS} .quote-footer-richtext h3:last-child {
    margin-bottom: 0;
  }

  .${EXPORT_ROOT_CLASS} .quote-richtext p,
  .${EXPORT_ROOT_CLASS} .quote-richtext ul,
  .${EXPORT_ROOT_CLASS} .quote-richtext ol,
  .${EXPORT_ROOT_CLASS} .quote-richtext blockquote,
  .${EXPORT_ROOT_CLASS} .quote-richtext h1,
  .${EXPORT_ROOT_CLASS} .quote-richtext h2,
  .${EXPORT_ROOT_CLASS} .quote-richtext h3 {
    margin: 0 0 10px;
  }

  .${EXPORT_ROOT_CLASS} .quote-richtext p:last-child,
  .${EXPORT_ROOT_CLASS} .quote-richtext ul:last-child,
  .${EXPORT_ROOT_CLASS} .quote-richtext ol:last-child,
  .${EXPORT_ROOT_CLASS} .quote-richtext blockquote:last-child,
  .${EXPORT_ROOT_CLASS} .quote-richtext h1:last-child,
  .${EXPORT_ROOT_CLASS} .quote-richtext h2:last-child,
  .${EXPORT_ROOT_CLASS} .quote-richtext h3:last-child {
    margin-bottom: 0;
  }

  .${EXPORT_ROOT_CLASS} .divider-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .${EXPORT_ROOT_CLASS} .divider-line {
    border-top: 1px solid var(--line);
    flex: 1;
  }

  .${EXPORT_ROOT_CLASS} .divider-dashed .divider-line {
    border-top-style: dashed;
  }

  .${EXPORT_ROOT_CLASS} .divider-thick .divider-line {
    border-top-width: 2px;
  }

  .${EXPORT_ROOT_CLASS} .divider-label {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .${EXPORT_ROOT_CLASS} .btn-row {
    display: flex;
  }

  .${EXPORT_ROOT_CLASS} .news-btn {
    border-radius: 999px;
    padding: 12px 20px;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s ease;
  }

  .${EXPORT_ROOT_CLASS} .news-btn:hover {
    opacity: 0.9;
  }

  .${EXPORT_ROOT_CLASS} .btn-primary {
    background: var(--brand);
    color: #fff;
  }

  .${EXPORT_ROOT_CLASS} .btn-secondary {
    background: #eff6ff;
    color: var(--brand);
    border: 1px solid #bfdbfe;
  }

  .${EXPORT_ROOT_CLASS} .btn-ghost {
    color: var(--brand);
    border: 1px solid #bfdbfe;
    background: #fff;
  }

  .${EXPORT_ROOT_CLASS} .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .${EXPORT_ROOT_CLASS} .table-caption {
    margin: 0;
    padding: 12px 14px;
    font-size: 14px;
    color: var(--muted);
    border-bottom: 1px solid var(--line);
    background: #f8fbff;
  }

  .${EXPORT_ROOT_CLASS} table {
    width: 100%;
    border-collapse: collapse;
  }

  .${EXPORT_ROOT_CLASS} th,
  .${EXPORT_ROOT_CLASS} td {
    border-bottom: 1px solid var(--line);
    padding: 12px 14px;
    text-align: left;
  }

  .${EXPORT_ROOT_CLASS} th {
    background: #f1f5f9;
    font-weight: 600;
  }

  .${EXPORT_ROOT_CLASS} .columns-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }

  .${EXPORT_ROOT_CLASS} .cards-grid,
  .${EXPORT_ROOT_CLASS} .stats-grid {
    display: grid;
    gap: 14px;
  }

  .${EXPORT_ROOT_CLASS} .cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .${EXPORT_ROOT_CLASS} .cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .${EXPORT_ROOT_CLASS} .column-item,
  .${EXPORT_ROOT_CLASS} .card-item,
  .${EXPORT_ROOT_CLASS} .stats-item {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: #fff;
    padding: 16px;
  }

  .${EXPORT_ROOT_CLASS} .column-item {
    flex: 1 1 var(--column-width, 320px);
    min-height: var(--column-height, auto);
  }

  .${EXPORT_ROOT_CLASS} .column-richtext p,
  .${EXPORT_ROOT_CLASS} .column-richtext ul,
  .${EXPORT_ROOT_CLASS} .column-richtext ol,
  .${EXPORT_ROOT_CLASS} .column-richtext blockquote,
  .${EXPORT_ROOT_CLASS} .column-richtext h1,
  .${EXPORT_ROOT_CLASS} .column-richtext h2,
  .${EXPORT_ROOT_CLASS} .column-richtext h3 {
    margin: 0 0 10px;
  }

  .${EXPORT_ROOT_CLASS} .column-richtext p:last-child,
  .${EXPORT_ROOT_CLASS} .column-richtext ul:last-child,
  .${EXPORT_ROOT_CLASS} .column-richtext ol:last-child,
  .${EXPORT_ROOT_CLASS} .column-richtext blockquote:last-child,
  .${EXPORT_ROOT_CLASS} .column-richtext h1:last-child,
  .${EXPORT_ROOT_CLASS} .column-richtext h2:last-child,
  .${EXPORT_ROOT_CLASS} .column-richtext h3:last-child {
    margin-bottom: 0;
  }

  .${EXPORT_ROOT_CLASS} .card-richtext p,
  .${EXPORT_ROOT_CLASS} .card-richtext ul,
  .${EXPORT_ROOT_CLASS} .card-richtext ol,
  .${EXPORT_ROOT_CLASS} .card-richtext blockquote,
  .${EXPORT_ROOT_CLASS} .card-richtext h1,
  .${EXPORT_ROOT_CLASS} .card-richtext h2,
  .${EXPORT_ROOT_CLASS} .card-richtext h3 {
    margin: 0 0 10px;
  }

  .${EXPORT_ROOT_CLASS} .card-richtext p:last-child,
  .${EXPORT_ROOT_CLASS} .card-richtext ul:last-child,
  .${EXPORT_ROOT_CLASS} .card-richtext ol:last-child,
  .${EXPORT_ROOT_CLASS} .card-richtext blockquote:last-child,
  .${EXPORT_ROOT_CLASS} .card-richtext h1:last-child,
  .${EXPORT_ROOT_CLASS} .card-richtext h2:last-child,
  .${EXPORT_ROOT_CLASS} .card-richtext h3:last-child {
    margin-bottom: 0;
  }

  .${EXPORT_ROOT_CLASS} .card-stat {
    margin: 0 0 8px;
    color: var(--brand);
    font-size: 24px;
    font-weight: 700;
  }

  .${EXPORT_ROOT_CLASS} .image-block {
    margin: 0;
  }

  .${EXPORT_ROOT_CLASS} .image-layout-shell {
    display: flex;
    width: 100%;
  }

  .${EXPORT_ROOT_CLASS} .image-layout {
    width: min(100%, 1100px);
    display: grid;
    grid-template-columns: minmax(220px, var(--image-column-width, 50%)) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }

  .${EXPORT_ROOT_CLASS} .image-layout.no-text {
    grid-template-columns: minmax(220px, var(--image-column-width, 50%));
  }

  .${EXPORT_ROOT_CLASS} .image-side-right {
    grid-template-columns: minmax(0, 1fr) minmax(220px, var(--image-column-width, 50%));
  }

  .${EXPORT_ROOT_CLASS} .image-side-right .image-block {
    order: 2;
  }

  .${EXPORT_ROOT_CLASS} .image-side-right .image-copy-richtext {
    order: 1;
  }

  .${EXPORT_ROOT_CLASS} .image-left {
    justify-content: flex-start;
  }

  .${EXPORT_ROOT_CLASS} .image-center {
    justify-content: center;
  }

  .${EXPORT_ROOT_CLASS} .image-right {
    justify-content: flex-end;
  }

  .${EXPORT_ROOT_CLASS} .image-block img {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
  }

  .${EXPORT_ROOT_CLASS} .image-block figcaption {
    margin-top: 8px;
    color: var(--muted);
    font-size: 13px;
  }

  .${EXPORT_ROOT_CLASS} .image-copy-richtext {
    min-width: 0;
  }

  .${EXPORT_ROOT_CLASS} .image-copy-richtext p,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext ul,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext ol,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext blockquote,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext h1,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext h2,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext h3 {
    margin: 0 0 10px;
  }

  .${EXPORT_ROOT_CLASS} .image-copy-richtext p:last-child,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext ul:last-child,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext ol:last-child,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext blockquote:last-child,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext h1:last-child,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext h2:last-child,
  .${EXPORT_ROOT_CLASS} .image-copy-richtext h3:last-child {
    margin-bottom: 0;
  }

  .${EXPORT_ROOT_CLASS} .stats-block h3 {
    margin: 0 0 12px;
    font-size: 24px;
  }

  .${EXPORT_ROOT_CLASS} .stats-value {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 800;
  }

  .${EXPORT_ROOT_CLASS} .stats-label {
    margin: 4px 0;
    color: var(--muted);
    font-weight: 600;
  }

  .${EXPORT_ROOT_CLASS} .stats-description {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
  }

  .${EXPORT_ROOT_CLASS} .chart-block {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 16px;
  }

  .${EXPORT_ROOT_CLASS} .chart-block.chart-frame-off {
    border: 0;
    border-radius: 0;
  }

  .${EXPORT_ROOT_CLASS} .chart-title-richtext h1,
  .${EXPORT_ROOT_CLASS} .chart-title-richtext h2,
  .${EXPORT_ROOT_CLASS} .chart-title-richtext h3 {
    margin: 0;
    line-height: 1.15;
  }

  .${EXPORT_ROOT_CLASS} .chart-title-richtext h1 {
    font-size: 36px;
  }

  .${EXPORT_ROOT_CLASS} .chart-title-richtext h2 {
    font-size: 30px;
  }

  .${EXPORT_ROOT_CLASS} .chart-title-richtext h3 {
    font-size: 22px;
  }

  .${EXPORT_ROOT_CLASS} .chart-block header p {
    margin: 8px 0 0;
    color: var(--muted);
  }

  .${EXPORT_ROOT_CLASS} .chart-block header .rich-text p,
  .${EXPORT_ROOT_CLASS} .chart-block header .rich-text ul,
  .${EXPORT_ROOT_CLASS} .chart-block header .rich-text ol,
  .${EXPORT_ROOT_CLASS} .chart-block header .rich-text blockquote,
  .${EXPORT_ROOT_CLASS} .chart-block header .rich-text h1,
  .${EXPORT_ROOT_CLASS} .chart-block header .rich-text h2,
  .${EXPORT_ROOT_CLASS} .chart-block header .rich-text h3 {
    margin: 0 0 10px;
  }

  .${EXPORT_ROOT_CLASS} .chart-body {
    margin-top: 14px;
    display: grid;
    gap: 10px;
  }

  .${EXPORT_ROOT_CLASS} .chart-image-wrap {
    display: block;
    flex: 0 0 auto;
    width: 100%;
    max-width: 100%;
  }

  .${EXPORT_ROOT_CLASS} .chart-imported-image {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
  }

  .${EXPORT_ROOT_CLASS} .chart-import-shell {
    display: flex;
    width: 100%;
  }

  .${EXPORT_ROOT_CLASS} .chart-image-layout {
    width: 100%;
    display: flex;
    align-items: start;
    gap: 22px;
  }

  .${EXPORT_ROOT_CLASS} .chart-image-layout.no-text {
    display: block;
  }

  .${EXPORT_ROOT_CLASS} .chart-image-side-left .chart-image-wrap {
    order: 2;
  }

  .${EXPORT_ROOT_CLASS} .chart-image-side-left .chart-copy-richtext {
    order: 1;
  }

  .${EXPORT_ROOT_CLASS} .chart-import-shell-left {
    justify-content: flex-start;
  }

  .${EXPORT_ROOT_CLASS} .chart-import-shell-center {
    justify-content: center;
  }

  .${EXPORT_ROOT_CLASS} .chart-import-shell-right {
    justify-content: flex-end;
  }

  .${EXPORT_ROOT_CLASS} .chart-copy-richtext {
    min-width: 0;
    flex: 1 1 0;
  }

  .${EXPORT_ROOT_CLASS} .chart-copy-richtext p,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext ul,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext ol,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext blockquote,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext h1,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext h2,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext h3 {
    margin: 0 0 10px;
  }

  .${EXPORT_ROOT_CLASS} .chart-copy-richtext p:last-child,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext ul:last-child,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext ol:last-child,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext blockquote:last-child,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext h1:last-child,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext h2:last-child,
  .${EXPORT_ROOT_CLASS} .chart-copy-richtext h3:last-child {
    margin-bottom: 0;
  }

  .${EXPORT_ROOT_CLASS} .chart-row {
    display: grid;
    grid-template-columns: 96px 1fr 44px;
    align-items: center;
    gap: 8px;
  }

  .${EXPORT_ROOT_CLASS} .chart-label,
  .${EXPORT_ROOT_CLASS} .chart-value {
    font-size: 14px;
    color: var(--muted);
  }

  .${EXPORT_ROOT_CLASS} .chart-bar-wrap {
    height: 14px;
    background: #eef2f9;
    border-radius: 999px;
    overflow: hidden;
    position: relative;
  }

  .${EXPORT_ROOT_CLASS} .chart-bar {
    height: 100%;
    border-radius: 999px;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-layout {
    display: grid;
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
    gap: 28px;
    align-items: center;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-layout-right {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-layout-right .chart-pie-panel {
    order: 2;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-layout-right .chart-pie-legend {
    order: 1;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-layout-bottom {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 22px;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-panel {
    display: grid;
    place-items: center;
    min-height: 220px;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-ring {
    width: min(220px, 100%);
    aspect-ratio: 1;
    border-radius: 50%;
    position: relative;
    box-shadow: inset 0 0 0 1px rgba(30, 103, 220, 0.08);
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-ring::after {
    content: '';
    position: absolute;
    inset: 22%;
    border-radius: 50%;
    background: #ffffff;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-legend {
    display: grid;
    gap: 14px;
    align-content: start;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-legend-row {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) 96px 54px;
    gap: 12px;
    align-items: center;
    padding: 2px 0;
  }

  .${EXPORT_ROOT_CLASS} .chart-color-chip {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-label,
  .${EXPORT_ROOT_CLASS} .chart-pie-value {
    font-size: 15px;
    color: var(--muted);
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-value {
    text-align: right;
    font-weight: 600;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-share {
    text-align: right;
    color: var(--muted);
    opacity: 0.8;
    font-size: 13px;
    font-weight: 600;
  }

  .${EXPORT_ROOT_CLASS} .chart-pie-layout-bottom .chart-pie-legend {
    width: min(720px, 100%);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 28px;
  }

  .${EXPORT_ROOT_CLASS} .muted {
    color: var(--muted);
  }

  @media (max-width: 900px) {
    .${EXPORT_ROOT_CLASS} .news-page {
      margin: 0;
      border-radius: 0;
      padding: 18px;
    }

    .${EXPORT_ROOT_CLASS} .cols-2,
    .${EXPORT_ROOT_CLASS} .cols-3,
    .${EXPORT_ROOT_CLASS} .stats-grid {
      grid-template-columns: 1fr;
    }

    .${EXPORT_ROOT_CLASS} .image-layout,
    .${EXPORT_ROOT_CLASS} .chart-image-layout,
    .${EXPORT_ROOT_CLASS} .image-side-right {
      grid-template-columns: 1fr;
    }

    .${EXPORT_ROOT_CLASS} .image-side-right .image-block,
    .${EXPORT_ROOT_CLASS} .image-side-right .image-copy-richtext,
    .${EXPORT_ROOT_CLASS} .chart-image-side-left .chart-image-wrap,
    .${EXPORT_ROOT_CLASS} .chart-image-side-left .chart-copy-richtext {
      order: initial;
    }

    .${EXPORT_ROOT_CLASS} .chart-pie-layout {
      grid-template-columns: 1fr;
    }

    .${EXPORT_ROOT_CLASS} .chart-pie-layout-bottom .chart-pie-legend {
      grid-template-columns: 1fr;
    }

    .${EXPORT_ROOT_CLASS} .chart-row {
      grid-template-columns: 96px 1fr 40px;
    }
  }
`

export const renderDocumentBlocksHtml = (blocks: ArticleBlock[]): string =>
  blocks.map(renderBlock).join('\n')

export const generateStandaloneHtml = (documentData: ArticleDocument): string => {
  const renderedBlocks = renderDocumentBlocksHtml(documentData.blocks)

  return `<style>${exportCss}</style>
<div class="${EXPORT_ROOT_CLASS}">
  <main class="news-page" style="--page-width:${Math.max(720, documentData.settings.pageWidth)}px;font-size:${documentData.settings.baseFontSize}px;">
    ${renderedBlocks}
  </main>
</div>`
}
