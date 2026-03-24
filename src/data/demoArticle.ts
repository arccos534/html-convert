import type { ArticleDocument } from '../types'
import { createBlock } from './blockFactory'

export const createDemoDocument = (): ArticleDocument => {
  const hero = createBlock('hero')
  if (hero.type === 'hero') {
    hero.data.title = 'Новый визуальный редактор новостей запущен в тестовом режиме'
    hero.data.subtitle =
      'Команда редакции получила современный конструктор статей с экспортом в один HTML-файл для старого Bitrix.'
    hero.data.backgroundEnabled = true
    hero.data.backgroundColorA = '#0f172a'
    hero.data.backgroundColorB = '#1d4ed8'
    hero.data.backgroundAngle = 135
    hero.data.backgroundStopA = 0
    hero.data.backgroundStopB = 100
  }

  const intro = createBlock('newsIntro')
  if (intro.type === 'newsIntro') {
    intro.data.leadHtml =
      '<p>Редакторы получили гибкий инструмент, который сочетает удобство no-code сборки с чистым HTML-экспортом. Это ускоряет выпуск новостей и снижает количество ручных правок в Bitrix.</p>'
  }

  const stats = createBlock('stats')
  const columns = createBlock('columns')
  const quote = createBlock('quote')
  const chart = createBlock('chart')
  const richText = createBlock('richText')
  if (richText.type === 'richText') {
    richText.data.html =
      '<h2>Что изменилось для редакторов</h2><ul><li>Сборка новости из визуальных блоков</li><li>Drag-and-drop перестановка секций</li><li>Сохранение черновика в JSON</li><li>Экспорт страницы в один автономный HTML</li></ul><p>В результате статья готовится быстрее, а финальный код остается чистым и семантичным.</p>'
  }

  const image = createBlock('image')
  const table = createBlock('table')
  const cards = createBlock('cards')

  return {
    version: 1,
    title: 'Демо-новость',
    updatedAt: new Date().toISOString(),
    settings: {
      pageWidth: 980,
      baseFontSize: 17,
      includeImagesAsBase64: true,
    },
    blocks: [hero, intro, stats, columns, quote, chart, richText, image, table, cards],
  }
}

