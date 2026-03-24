export type TextAlign = 'left' | 'center' | 'right'

export type BlockType =
  | 'hero'
  | 'newsIntro'
  | 'richText'
  | 'callout'
  | 'important'
  | 'quote'
  | 'background'
  | 'divider'
  | 'button'
  | 'table'
  | 'columns'
  | 'cards'
  | 'image'
  | 'stats'
  | 'chart'

export interface SpacingSettings {
  marginTop: number
  marginBottom: number
}

export interface HeroData {
  title: string
  subtitle: string
  backgroundEnabled: boolean
  backgroundColorA: string
  backgroundColorB: string
  backgroundAngle: number
  backgroundStopA: number
  backgroundStopB: number
  textColor: string
  align: TextAlign
}

export interface NewsIntroData {
  title: string
  subtitle: string
  leadHtml: string
  align: TextAlign
}

export interface RichTextData {
  html: string
  align: TextAlign
  paragraphGap: number
  fontSize: number
}

export interface CalloutData {
  title: string
  content: string
  tone: 'info' | 'success' | 'warning' | 'danger'
}

export interface ImportantData {
  title: string
  content: string
}

export interface QuoteData {
  html?: string
  footerHtml?: string
  quote: string
  author: string
  source: string
  accentColor: string
  width: number
  minHeight: number
}

export interface BackgroundData {
  title: string
  contentHtml: string
  background: string
  textColor: string
}

export interface DividerData {
  style: 'solid' | 'dashed' | 'thick'
  color: string
  label: string
}

export interface ButtonData {
  label: string
  url: string
  align: TextAlign
  variant: 'primary' | 'secondary' | 'ghost'
}

export interface TableData {
  caption: string
  headers: string[]
  rows: string[][]
}

export interface ColumnItem {
  html: string
}

export interface ColumnsData {
  count: number
  columns: ColumnItem[]
  columnWidth: number
  columnHeight: number
}

export interface CardItem {
  html?: string
  title?: string
  content?: string
  stat?: string
}

export interface CardsData {
  columns: 2 | 3
  cards: CardItem[]
}

export interface ImageData {
  src: string
  alt: string
  caption: string
  textHtml: string
  imageSide: 'left' | 'right'
  width: number
  align: TextAlign
  radius: number
  shadow: boolean
  withPadding: boolean
}

export interface StatItem {
  label: string
  value: string
  description: string
}

export interface StatsData {
  title: string
  items: StatItem[]
}

export interface ChartItem {
  label: string
  value: number
  color: string
}

export type ChartType = 'bar' | 'pie'

export interface ChartData {
  title: string
  titleHtml?: string
  description: string
  descriptionHtml?: string
  max: number
  importSource?: 'manual' | 'excel' | 'image'
  imageSrc?: string
  imageAlt?: string
  align: TextAlign
  tableHeaders?: string[]
  tableRows?: string[][]
  autoMax?: boolean
  showValues?: boolean
  showGrid?: boolean
  height?: number
  chartType?: ChartType
  pieLegendPosition?: 'left' | 'right' | 'bottom'
  items: ChartItem[]
}

interface BaseBlock<T extends BlockType, D> {
  id: string
  type: T
  spacing: SpacingSettings
  data: D
}

export type HeroBlock = BaseBlock<'hero', HeroData>
export type NewsIntroBlock = BaseBlock<'newsIntro', NewsIntroData>
export type RichTextBlock = BaseBlock<'richText', RichTextData>
export type CalloutBlock = BaseBlock<'callout', CalloutData>
export type ImportantBlock = BaseBlock<'important', ImportantData>
export type QuoteBlock = BaseBlock<'quote', QuoteData>
export type BackgroundBlock = BaseBlock<'background', BackgroundData>
export type DividerBlock = BaseBlock<'divider', DividerData>
export type ButtonBlock = BaseBlock<'button', ButtonData>
export type TableBlock = BaseBlock<'table', TableData>
export type ColumnsBlock = BaseBlock<'columns', ColumnsData>
export type CardsBlock = BaseBlock<'cards', CardsData>
export type ImageBlock = BaseBlock<'image', ImageData>
export type StatsBlock = BaseBlock<'stats', StatsData>
export type ChartBlock = BaseBlock<'chart', ChartData>

export type ArticleBlock =
  | HeroBlock
  | NewsIntroBlock
  | RichTextBlock
  | CalloutBlock
  | ImportantBlock
  | QuoteBlock
  | BackgroundBlock
  | DividerBlock
  | ButtonBlock
  | TableBlock
  | ColumnsBlock
  | CardsBlock
  | ImageBlock
  | StatsBlock
  | ChartBlock

export interface ArticleSettings {
  pageWidth: number
  baseFontSize: number
  includeImagesAsBase64: boolean
}

export interface ArticleDocument {
  version: number
  title: string
  updatedAt: string
  settings: ArticleSettings
  blocks: ArticleBlock[]
}

export interface BlockTemplate {
  type: BlockType
  name: string
  description: string
  category: 'Templates' | 'Text' | 'Highlights' | 'Layout' | 'Media' | 'Data'
}

