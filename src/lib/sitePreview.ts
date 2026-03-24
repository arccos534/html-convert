import type { ArticleBlock, ArticleDocument } from '../types'
import {
  escapeHtml,
  EXPORT_ROOT_CLASS,
  exportCss,
  renderDocumentBlocksHtml,
} from './exportHtml'

export interface PreviewMeta {
  title: string
  summary: string
  dateLabel: string
  imageSrc: string
  imageAlt: string
}

const stripHtml = (value: string): string =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getBlockOfType = <T extends ArticleBlock['type']>(
  blocks: ArticleBlock[],
  type: T,
): Extract<ArticleBlock, { type: T }> | null =>
  (blocks.find((block) => block.type === type) as Extract<ArticleBlock, { type: T }>) ?? null

const fallbackDateLabel = (updatedAt: string): string => {
  const date = new Date(updatedAt)

  if (Number.isNaN(date.getTime())) {
    return 'Сегодня'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const createFallbackImage = (title: string): string => {
  const shortTitle = escapeHtml(title.slice(0, 80) || 'Новость')

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10203b" />
          <stop offset="52%" stop-color="#154b9c" />
          <stop offset="100%" stop-color="#2d7eea" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" fill="url(#g)" />
      <circle cx="1020" cy="110" r="170" fill="rgba(255,255,255,0.08)" />
      <circle cx="180" cy="620" r="220" fill="rgba(255,255,255,0.08)" />
      <text x="84" y="118" fill="#dce9ff" font-family="Arial, sans-serif" font-size="28" letter-spacing="5">НОВОСТИ</text>
      <foreignObject x="84" y="160" width="920" height="440">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font-family:Georgia,serif;font-size:68px;line-height:1.08;font-weight:700;">
          ${shortTitle}
        </div>
      </foreignObject>
    </svg>
  `)}`
}

export const extractPreviewMeta = (documentData: ArticleDocument): PreviewMeta => {
  const hero = getBlockOfType(documentData.blocks, 'hero')
  const intro = getBlockOfType(documentData.blocks, 'newsIntro')
  const image = getBlockOfType(documentData.blocks, 'image')
  const richText = getBlockOfType(documentData.blocks, 'richText')

  const title =
    hero?.data.title?.trim() ||
    intro?.data.title?.trim() ||
    documentData.title?.trim() ||
    'Новая новость'

  const summary =
    hero?.data.subtitle?.trim() ||
    stripHtml(intro?.data.leadHtml ?? '') ||
    stripHtml(richText?.data.html ?? '') ||
    'Материал подготовлен в редакторе и готов к публикации.'

  const dateLabel = fallbackDateLabel(documentData.updatedAt)
  const imageSrc = image?.data.src?.trim() || createFallbackImage(title)
  const imageAlt = image?.data.alt?.trim() || title

  return {
    title,
    summary,
    dateLabel,
    imageSrc,
    imageAlt,
  }
}

const sidebarLead = {
  time: 'Сегодня, вторник, 14:30',
  title: 'Лучшие практики корпоративного волонтёрства представили в Приморье',
  image:
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80',
}

const sidebarItems = [
  {
    time: 'Сегодня, вторник, 14:00',
    title: 'Профильные классы в находкинской школе представили Губернатору Приморья',
  },
  {
    time: 'Сегодня, вторник, 11:30',
    title: 'Девять учреждений культуры обновят в Приморье по президентской программе',
  },
]

const sidebarHtml = sidebarItems
  .map(
    (item) => `
      <article class="site-side-item">
        <p class="site-side-time">${escapeHtml(item.time)}</p>
        <a href="#" onclick="return false;">${escapeHtml(item.title)}</a>
      </article>
    `,
  )
  .join('')

export const generateSiteArticlePreviewHtml = (documentData: ArticleDocument): string => {
  const meta = extractPreviewMeta(documentData)
  const articleHtml = renderDocumentBlocksHtml(documentData.blocks)

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(meta.title)}</title>
    <style>
      ${exportCss}

      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #163255;
        font-family: "Open Sans", "Segoe UI", Arial, sans-serif;
        line-height: 1.45;
      }

      a {
        color: #0068c9;
      }

      .bitrix-news-builder-content .site-preview-article.news-page {
        max-width: none;
        margin: 0;
        background: transparent !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .site-topline {
        border-top: 7px solid #2b2f35;
        background: #ffffff;
      }

      .site-inner {
        width: min(1300px, calc(100% - 48px));
        margin: 0 auto;
      }

      .site-service-nav {
        display: flex;
        gap: 28px;
        align-items: center;
        min-height: 54px;
        font-size: 14px;
        color: #24466e;
      }

      .site-brand-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
        padding: 18px 0 22px;
      }

      .site-brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .site-brand-badge {
        width: 50px;
        height: 64px;
        border-radius: 14px 14px 22px 22px;
        background: linear-gradient(180deg, #5bbde2 0%, #2677c9 50%, #175196 100%);
        box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.5);
      }

      .site-brand-text {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.3;
        color: #15355c;
      }

      .site-main-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        font-size: 18px;
        color: #163d67;
      }

      .site-breadcrumb-wrap {
        background: #eef3fb;
        border-top: 1px solid #e1e9f6;
        border-bottom: 1px solid #e1e9f6;
      }

      .site-breadcrumbs {
        display: flex;
        gap: 10px;
        align-items: center;
        min-height: 40px;
        font-size: 15px;
        color: #5b7091;
      }

      .site-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 66px;
        padding: 42px 0 70px;
      }

      .site-page-title {
        margin: 0 0 36px;
        font-size: 56px;
        line-height: 1;
        font-weight: 400;
        color: #16355c;
      }

      .site-article-date {
        margin: 0 0 14px;
        font-size: 18px;
        color: #5d78a6;
      }

      .site-preview-article .hero h1 {
        margin: 0 0 14px;
        font-size: 30px;
        line-height: 1.15;
      }

      .site-preview-article .hero-subtitle {
        max-width: 860px;
      }

      .site-preview-article .news-block {
        width: 100%;
      }

      .site-preview-article .news-intro h2 {
        font-size: 28px;
        line-height: 1.2;
      }

      .site-preview-article .news-intro .lead,
      .site-preview-article .rich-text,
      .site-preview-article .bg-block,
      .site-preview-article .callout,
      .site-preview-article .important,
      .site-preview-article .quote,
      .site-preview-article .table-wrap,
      .site-preview-article .chart-block,
      .site-preview-article .stats-block,
      .site-preview-article .cards-grid,
      .site-preview-article .columns-grid {
        font-size: 18px;
      }

      .site-preview-article .rich-text p,
      .site-preview-article .rich-text li,
      .site-preview-article .bg-block p,
      .site-preview-article .callout p,
      .site-preview-article .important p,
      .site-preview-article .quote p {
        line-height: 1.5;
      }

      .site-preview-article .image-block img {
        width: 100% !important;
      }

      .site-side {
        padding-top: 22px;
      }

      .site-side-title {
        margin: 0 0 18px;
        font-size: 28px;
        font-weight: 400;
        color: #173f67;
      }

      .site-side-card {
        margin-bottom: 24px;
      }

      .site-side-card img {
        display: block;
        width: 100%;
        height: auto;
      }

      .site-side-time {
        margin: 0 0 6px;
        font-size: 15px;
        font-weight: 700;
        color: #1e3552;
      }

      .site-side-item {
        margin-bottom: 20px;
      }

      .site-side-item a {
        text-decoration: none;
        font-size: 16px;
        line-height: 1.45;
      }

      @media (max-width: 1100px) {
        .site-layout {
          grid-template-columns: 1fr;
          gap: 34px;
        }

        .site-page-title {
          font-size: 44px;
        }
      }

      @media (max-width: 760px) {
        .site-inner {
          width: min(100%, calc(100% - 28px));
        }

        .site-service-nav,
        .site-main-nav {
          gap: 16px;
          font-size: 14px;
        }

        .site-page-title {
          font-size: 38px;
        }
      }
    </style>
  </head>
  <body>
    <header class="site-topline">
      <div class="site-inner">
        <div class="site-service-nav">
          <span>Документы</span>
          <span>Вакансии</span>
          <span>Госуслуги</span>
          <span>Приморский край</span>
          <span>Социальный справочник</span>
        </div>
        <div class="site-brand-row">
          <div class="site-brand">
            <div class="site-brand-badge"></div>
            <div class="site-brand-text">Правительство<br />Приморского края</div>
          </div>
          <nav class="site-main-nav">
            <span>Новости</span>
            <span>Губернатор</span>
            <span>Правительство</span>
            <span>Органы власти</span>
            <span>Приёмная</span>
            <span>Проекты</span>
          </nav>
        </div>
      </div>
    </header>

    <div class="site-breadcrumb-wrap">
      <div class="site-inner">
        <div class="site-breadcrumbs">
          <span>Правительство Приморского края</span>
          <span>/</span>
          <span>Новости</span>
        </div>
      </div>
    </div>

    <main class="site-inner">
      <section class="site-layout">
        <div>
          <h1 class="site-page-title">Новости</h1>
          <p class="site-article-date">${escapeHtml(meta.dateLabel)}</p>
          <div class="${EXPORT_ROOT_CLASS}">
            <div class="site-preview-article news-page" style="--page-width:100%;font-size:${Math.max(16, documentData.settings.baseFontSize)}px;">
              ${articleHtml}
            </div>
          </div>
        </div>

        <aside class="site-side">
          <h2 class="site-side-title">Главные новости</h2>
          <article class="site-side-card">
            <img src="${escapeHtml(sidebarLead.image)}" alt="${escapeHtml(sidebarLead.title)}" />
            <p class="site-side-time">${escapeHtml(sidebarLead.time)}</p>
            <a href="#" onclick="return false;">${escapeHtml(sidebarLead.title)}</a>
          </article>
          ${sidebarHtml}
        </aside>
      </section>
    </main>
  </body>
</html>`
}
