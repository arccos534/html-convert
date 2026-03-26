import { v4 as uuidv4 } from 'uuid'
import type {
  ArticleBlock,
  BlockTemplate,
  CardItem,
  ChartItem,
  SpacingSettings,
  BlockType,
} from '../types'
import { createDefaultHeroBackground } from '../lib/heroBackground'
import { createColumns, DEFAULT_COLUMN_HEIGHT, DEFAULT_COLUMN_WIDTH } from '../lib/columns'
import { getButtonPreset } from '../lib/buttonStyle'

const createSpacing = (marginTop = 14, marginBottom = 14): SpacingSettings => ({
  marginTop,
  marginBottom,
})

const defaultRichTextHtml =
  '<h2>Новый раздел</h2><p>Добавьте основной текст новости. Можно использовать списки, ссылки, цитаты и форматирование.</p>'

const createCards = (): CardItem[] => [
  {
    html: '<p><span style="color:#1e67dc;font-size:22px;font-weight:700;">+24%</span></p><h3>Ключевая метрика</h3><p>Рост вовлеченности после запуска новой функции.</p>',
    stat: '+24%',
  },
  {
    html: '<p><span style="color:#1e67dc;font-size:22px;font-weight:700;">3 ч 10 мин</span></p><h3>Время отклика</h3><p>Средний цикл публикации новости по редакции.</p>',
    stat: '3 ч 10 мин',
  },
  {
    html: '<p><span style="color:#1e67dc;font-size:22px;font-weight:700;">4.8/5</span></p><h3>Пользовательская оценка</h3><p>Оценка удобства новой страницы редактора.</p>',
    stat: '4.8/5',
  },
]

const createChartItems = (): ChartItem[] => [
  { label: 'Пн', value: 34, color: '#1f8efa' },
  { label: 'Вт', value: 52, color: '#38bdf8' },
  { label: 'Ср', value: 47, color: '#16a34a' },
  { label: 'Чт', value: 63, color: '#f59e0b' },
  { label: 'Пт', value: 75, color: '#ef4444' },
]

export const createBlock = (type: BlockType): ArticleBlock => {
  const id = uuidv4()

  switch (type) {
    case 'hero':
      const heroBackground = createDefaultHeroBackground()

      return {
        id,
        type,
        spacing: createSpacing(0, 18),
        data: {
          title: 'Заголовок главной новости',
          titleHtml: '<h1>Заголовок главной новости</h1>',
          subtitle: 'Короткий подзаголовок с контекстом и ключевым сообщением.',
          subtitleHtml: '<p>Короткий подзаголовок с контекстом и ключевым сообщением.</p>',
          backgroundEnabled: heroBackground.enabled,
          backgroundColorA: heroBackground.colorA,
          backgroundColorB: heroBackground.colorB,
          backgroundAngle: heroBackground.angle,
          backgroundStopA: heroBackground.stopA,
          backgroundStopB: heroBackground.stopB,
          textColor: '#1b2438',
          align: 'left',
        },
      }
    case 'newsIntro':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          title: 'Заголовок новости',
          subtitle: 'Подзаголовок с ключевой мыслью',
          leadHtml:
            '<p><strong>Лид новости:</strong> вводный абзац для читателя, который объясняет, что произошло и почему это важно.</p>',
          align: 'left',
        },
      }
    case 'richText':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          html: defaultRichTextHtml,
          align: 'left',
          paragraphGap: 14,
          fontSize: 17,
        },
      }
    case 'callout':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          title: 'Информационная плашка',
          content: 'Используйте этот блок для важных уточнений и коротких сообщений.',
          tone: 'info',
        },
      }
    case 'important':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          title: 'Важно',
          content:
            'Критически важная информация для читателя: ограничения, сроки, контактные данные.',
          accentColor: '#f7c476',
          borderColor: '#f7c476',
          radius: 14,
        },
      }
    case 'quote':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          html:
            '<p>Наша задача была сделать редактор, который помогает думать о смысле текста, а не о борьбе с интерфейсом.</p>',
          footerHtml: '<p>Редактор проекта, Комментарий к релизу</p>',
          quote:
            'Наша задача была сделать редактор, который помогает думать о смысле текста, а не о борьбе с интерфейсом.',
          author: 'Редактор проекта',
          source: 'Комментарий к релизу',
          accentColor: '#1e67dc',
          width: 100,
          minHeight: 140,
        },
      }
    case 'background':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          title: 'Блок с фоном',
          contentHtml:
            '<p>Подходит для акцентных секций, примечаний и выделения самостоятельной мысли внутри статьи.</p>',
          background: '#f1f5f9',
          textColor: '#0f172a',
        },
      }
    case 'divider':
      return {
        id,
        type,
        spacing: createSpacing(8, 8),
        data: {
          style: 'solid',
          color: '#cbd5e1',
          label: '',
        },
      }
    case 'button':
      const buttonPreset = getButtonPreset('primary')
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          label: 'Перейти к материалу',
          url: 'https://example.com',
          align: 'left',
          variant: 'primary',
          backgroundColor: buttonPreset.backgroundColor,
          textColor: buttonPreset.textColor,
          borderColor: buttonPreset.borderColor,
          backgroundOpacity: 100,
          size: 100,
          borderWidth: buttonPreset.borderWidth,
          radius: buttonPreset.radius,
        },
      }
    case 'table':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          caption: 'Сравнение показателей',
          headers: ['Показатель', 'До', 'После'],
          rows: [
            ['Время подготовки новости', '4ч 20м', '2ч 45м'],
            ['Процент правок', '38%', '17%'],
            ['Публикаций в неделю', '12', '18'],
          ],
        },
      }
    case 'columns':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          count: 2,
          columns: createColumns(2),
          columnWidth: DEFAULT_COLUMN_WIDTH,
          columnHeight: DEFAULT_COLUMN_HEIGHT,
        },
      }
    case 'cards':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          columns: 3,
          cards: createCards(),
        },
      }
    case 'image':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          src: '',
          alt: 'Изображение новости',
          caption: 'Подпись под изображением',
          textHtml: '',
          imageSide: 'left',
          width: 100,
          align: 'center',
          radius: 14,
          shadow: true,
          withPadding: false,
        },
      }
    case 'stats':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          title: 'Ключевые показатели',
          items: [
            {
              label: 'Публикации',
              value: '128',
              description: 'Материалов за последний месяц',
            },
            {
              label: 'Охват',
              value: '2.4M',
              description: 'Просмотров на сайте и в ленте',
            },
            {
              label: 'CTR',
              value: '8.6%',
              description: 'Средняя кликабельность ссылок',
            },
          ],
        },
      }
    case 'chart':
      return {
        id,
        type,
        spacing: createSpacing(),
        data: {
          title: 'Динамика публикаций',
          titleHtml: '<h3>Динамика публикаций</h3>',
          description: 'Количество опубликованных материалов по дням недели',
          descriptionHtml: '<p>Количество опубликованных материалов по дням недели</p>',
          textHtml: '',
          max: 100,
          importSource: 'manual',
          imageSrc: '',
          imageAlt: 'Диаграмма',
          align: 'left',
          imageWidth: 100,
          imageTextSide: 'right',
          frameEnabled: true,
          tableHeaders: [],
          tableRows: [],
          autoMax: false,
          showValues: true,
          showGrid: true,
          height: 240,
          chartType: 'bar',
          pieLegendPosition: 'left',
          items: createChartItems(),
        },
      }
    default:
      return {
        id,
        type: 'richText',
        spacing: createSpacing(),
        data: {
          html: defaultRichTextHtml,
          align: 'left',
          paragraphGap: 14,
          fontSize: 17,
        },
      }
  }
}

export const blockTemplates: BlockTemplate[] = [
  {
    type: 'hero',
    name: 'Заголовок',
    description: 'Обложка новости с фоном',
    category: 'Templates',
  },
  {
    type: 'newsIntro',
    name: 'Новостной блок',
    description: 'Заголовок + подзаголовок + лид',
    category: 'Templates',
  },
  {
    type: 'columns',
    name: 'Колонки',
    description: 'Секция с колонками и тезисами',
    category: 'Templates',
  },
  {
    type: 'cards',
    name: 'Карточки',
    description: 'Сетка карточек с акцентом на факты',
    category: 'Templates',
  },
  {
    type: 'quote',
    name: 'Цитата',
    description: 'Блок для цитаты эксперта',
    category: 'Templates',
  },
  {
    type: 'chart',
    name: 'Диаграмма',
    description: 'Простой график по значениям',
    category: 'Media',
  },
  {
    type: 'richText',
    name: 'Текст',
    description: 'Гибкий текстовый блок с форматированием',
    category: 'Text',
  },
  {
    type: 'important',
    name: 'Важно',
    description: 'Акцентный блок-предупреждение',
    category: 'Highlights',
  },
  {
    type: 'divider',
    name: 'Разделитель',
    description: 'Линия или подпись между секциями',
    category: 'Layout',
  },
  {
    type: 'button',
    name: 'Кнопка',
    description: 'CTA-кнопка со ссылкой',
    category: 'Layout',
  },
  {
    type: 'image',
    name: 'Изображение',
    description: 'Картинка с подписью и настройками',
    category: 'Media',
  },
]

