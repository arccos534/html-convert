import type { ColumnItem, ColumnsData } from '../types'

export const MIN_COLUMN_COUNT = 2
export const DEFAULT_COLUMN_WIDTH = 320
export const MIN_COLUMN_WIDTH = 180
export const MAX_COLUMN_WIDTH = 560
export const DEFAULT_COLUMN_HEIGHT = 0
export const MIN_COLUMN_HEIGHT = 0
export const MAX_COLUMN_HEIGHT = 480

const columnPresets = [
  {
    title: 'Колонка 1',
    content: 'Краткий тезис или вводный абзац.',
  },
  {
    title: 'Колонка 2',
    content: 'Дополнительные детали, факты или мнение эксперта.',
  },
  {
    title: 'Колонка 3',
    content: 'Вывод и следующий шаг для читателя.',
  },
  {
    title: 'Колонка 4',
    content: 'Добавьте дополнительный смысловой блок.',
  },
]

export const clampColumnCount = (value: number) =>
  Math.max(MIN_COLUMN_COUNT, Math.round(value || MIN_COLUMN_COUNT))

export const clampColumnWidth = (value: number) =>
  Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, Math.round(value || DEFAULT_COLUMN_WIDTH)))

export const clampColumnHeight = (value: number) =>
  Math.max(MIN_COLUMN_HEIGHT, Math.min(MAX_COLUMN_HEIGHT, Math.round(value || DEFAULT_COLUMN_HEIGHT)))

export const createColumnItem = (index: number): ColumnItem => {
  const preset = columnPresets[index]

  return {
    html: `<h3>${preset?.title ?? `Колонка ${index + 1}`}</h3><p>${preset?.content ?? 'Добавьте текст колонки.'}</p>`,
  }
}

export const createColumns = (count: number): ColumnItem[] =>
  Array.from({ length: clampColumnCount(count) }, (_, index) => createColumnItem(index))

export const buildColumnsStyle = (width: number, height: number) =>
  `--column-width:${clampColumnWidth(width)}px;--column-height:${clampColumnHeight(height) > 0 ? `${clampColumnHeight(height)}px` : 'auto'};`

export const normalizeColumnsData = (
  value: Partial<ColumnsData> & Record<string, unknown>,
): ColumnsData => {
  const count = clampColumnCount(Number(value.count ?? value.variant ?? MIN_COLUMN_COUNT))
  const sourceColumns = Array.isArray(value.columns) ? value.columns : []
  const legacyWidths = Array.isArray(value.widths) ? value.widths : []

  return {
    count,
    columns: Array.from({ length: count }, (_, index) => {
      const source = sourceColumns[index] as
        | (Partial<ColumnItem> & { html?: string; title?: string; contentHtml?: string; content?: string })
        | undefined
      const fallback = createColumnItem(index)

      return {
        html: String(
          source?.html ||
            (source?.title || source?.contentHtml || source?.content
              ? `<h3>${source?.title || `Колонка ${index + 1}`}</h3>${
                  source?.contentHtml ||
                  (typeof source?.content === 'string' && source.content.trim()
                    ? `<p>${source.content}</p>`
                    : '<p>Добавьте текст колонки.</p>')
                }`
              : fallback.html),
        ),
      }
    }),
    columnWidth: clampColumnWidth(
      Number(value.columnWidth ?? legacyWidths[0] ?? DEFAULT_COLUMN_WIDTH),
    ),
    columnHeight: clampColumnHeight(Number(value.columnHeight ?? DEFAULT_COLUMN_HEIGHT)),
  }
}
