import type { ArticleBlock, ArticleDocument } from '../types'
import coatOfArms from '../assets/primorye-coat-of-arms.svg?inline'
import sidebarPhoto from '../assets/primorye-sidebar-photo.jpg?url'
import portalCss from './primoryePreview.css?inline'
import { escapeHtml, generateStandaloneHtml } from './exportHtml'
import { sanitizeHtml } from './sanitizeHtml'

const getBlockOfType = <T extends ArticleBlock['type']>(blocks: ArticleBlock[], type: T) =>
  blocks.find((block): block is Extract<ArticleBlock, { type: T }> => block.type === type)

const plainText = (html: string) => {
  const fragment = document.createElement('template')
  fragment.innerHTML = sanitizeHtml(html)
  return (fragment.content.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Vladivostok',
})

const extractPreviewMeta = (draft: ArticleDocument) => {
  const hero = getBlockOfType(draft.blocks, 'hero')
  const intro = getBlockOfType(draft.blocks, 'newsIntro')
  const richText = getBlockOfType(draft.blocks, 'richText')
  const cover = draft.blocks.find((block) => block.type === 'image' && block.data.src.trim() !== '')
  const title = plainText(hero?.data.titleHtml ?? '') || hero?.data.title?.trim()
    || intro?.data.title?.trim() || draft.title.trim() || 'Новая новость'
  const summary = plainText(hero?.data.subtitleHtml ?? '') || hero?.data.subtitle?.trim()
    || plainText(intro?.data.leadHtml ?? '') || plainText(richText?.data.html ?? '')
  const date = new Date(draft.updatedAt)

  return {
    title: escapeHtml(title),
    summary: escapeHtml(summary),
    date: Number.isNaN(date.getTime()) ? '' : escapeHtml(dateFormatter.format(date).replace(',', '')),
    cover: cover?.type === 'image' ? escapeHtml(cover.data.src.trim()) : '',
  }
}

const headerHtml = `
  <header>
    <div class="service-bar"><div class="container service-links">
      <span>Документы</span><span>Вакансии</span><span>Противодействие коррупции</span>
      <span>Госуслуги</span><span>Приморский край</span><span>Социальный справочник</span>
    </div></div>
    <div class="container masthead">
      <div class="brand"><img src="${escapeHtml(coatOfArms)}" alt=""><span>Правительство<br>Приморского края</span></div>
      <div class="primary-nav" aria-hidden="true">
        <span>Новости</span><span>Губернатор</span><span>Правительство</span><span>Органы власти</span>
        <span>Приёмная</span><span>Проекты</span><span>Полезная информация</span>
      </div>
    </div>
  </header>`

// Context from the saved portal page. Only the draft participates in preview navigation.
const sidebarHtml = `
  <aside class="portal-side" aria-labelledby="main-news">
    <h2 id="main-news">Главные новости</h2>
    <img class="side-image" src="${escapeHtml(sidebarPhoto)}" alt="">
    <p><time datetime="2026-11-22T09:25:00+10:00">22.11.2026 09:25</time>Олег Кожемяко: Находкинский судоремонтный завод планирует расширять производство судов</p>
    <p><time datetime="2026-11-22T09:20:00+10:00">22.11.2026 09:20</time>Исторический центр Находки обновят</p>
    <p><time datetime="2026-11-22T09:15:00+10:00">22.11.2026 09:15</time>В Находке стартовал кубок Приморского края по карате</p>
  </aside>`

const pageHtml = (title: string, trail: string, main: string) => `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' https: http: data:; base-uri 'none'; form-action 'none'">
  <title>${title}</title>
  <style>${portalCss}</style>
</head>
<body>
  ${headerHtml}
  <nav class="breadcrumb-bar" aria-label="Хлебные крошки">
    <div class="container"><span class="portal-link-tone">Правительство Приморского края</span><span class="breadcrumb-separator" aria-hidden="true">/</span>${trail}</div>
  </nav>
  <main class="container portal-grid">${main}${sidebarHtml}</main>
</body>
</html>`

export const generateSiteFeedPreviewHtml = (draft: ArticleDocument): string => {
  const meta = extractPreviewMeta(draft)
  return pageHtml('Новости', '<span aria-current="page">Новости</span>', `
    <section aria-labelledby="preview-heading">
      <h1 class="portal-heading" id="preview-heading">Новости</h1>
      <a class="feed-card" id="preview-open-article" href="#article">
        ${meta.cover ? `<img src="${meta.cover}" alt="">` : ''}
        <div>
          ${meta.date ? `<time>${meta.date}</time>` : ''}
          <h2>${meta.title}</h2>
          ${meta.summary ? `<p>${meta.summary}</p>` : ''}
        </div>
      </a>
    </section>`)
}

export const generateSiteArticlePreviewHtml = (draft: ArticleDocument): string => {
  const meta = extractPreviewMeta(draft)
  return pageHtml(meta.title, `
    <a id="preview-return-to-feed" href="#news" aria-label="К списку новостей">Новости</a>
    <span class="breadcrumb-separator" aria-hidden="true">/</span><span aria-current="page">${meta.title}</span>`, `
    <article>
      <h1 class="portal-heading" id="preview-heading" tabindex="-1">${meta.title}</h1>
      ${meta.date ? `<time class="article-date">${meta.date}</time>` : ''}
      <div class="maincontent">${generateStandaloneHtml(draft)}</div>
    </article>`)
}
