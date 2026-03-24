import { useEffect, useMemo, useState } from 'react'
import type { ArticleBlock, ArticleSettings, ChartType, TextAlign } from '../../types'
import * as XLSX from 'xlsx'
import {
  clampColumnCount,
  clampColumnHeight,
  clampColumnWidth,
  createColumnItem,
  DEFAULT_COLUMN_HEIGHT,
  DEFAULT_COLUMN_WIDTH,
  MAX_COLUMN_HEIGHT,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_HEIGHT,
  MIN_COLUMN_WIDTH,
} from '../../lib/columns'
import {
  fetchImageAsDataUrl,
  isEmbeddedImageSource,
  readImageAsDataUrl,
} from '../../lib/documentIO'
import {
  buildHeroBackground,
  createDefaultHeroBackground,
  heroGradientDirections,
} from '../../lib/heroBackground'
import {
  importSpreadsheetFile,
  renderChartItemsToSvgDataUrl,
  renderTableToSvgDataUrl,
} from '../../lib/chartImport'

interface SettingsPanelProps {
  block: ArticleBlock | null
  settings: ArticleSettings
  onUpdateBlock: (block: ArticleBlock) => void
  onUpdateSettings: (settings: ArticleSettings) => void
}

const number = (value: string, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const alignOptions: Array<{ value: TextAlign; label: string }> = [
  { value: 'left', label: 'Слева' },
  { value: 'center', label: 'По центру' },
  { value: 'right', label: 'Справа' },
]

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

const joinRows = (rows: string[][]) => rows.map((row) => row.join(' | ')).join('\n')

const splitRows = (value: string) =>
  splitLines(value).map((line) => line.split('|').map((cell) => cell.trim()))

const createCardItem = () => ({
  title: 'Новая карточка',
  content: 'Краткое описание карточки.',
  stat: '',
})

const createStatItem = () => ({
  label: 'Показатель',
  value: '0',
  description: 'Короткое пояснение',
})

const createChartItem = () => ({
  label: 'Новый пункт',
  value: 0,
  color: '#1f8efa',
})

const chartTypeOptions: Array<{ value: ChartType; label: string }> = [
  { value: 'bar', label: 'Полосы' },
  { value: 'pie', label: 'Круговая' },
]

const moveItem = <T,>(items: T[], from: number, to: number) => {
  if (to < 0 || to >= items.length) {
    return items
  }

  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const chartPalette = ['#1f8efa', '#38bdf8', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed']

const normalizeImportedChartValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const normalized = String(value).replace(',', '.').replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const importChartItemsFromFile = async (file: File) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: true,
    defval: '',
  })

  const preparedRows = rows
    .map((row) => [row?.[0], row?.[1], row?.[2]] as const)
    .filter(([label, value]) => String(label || '').trim() && value !== '')
    .map(([label, value, color], index) => {
      const parsed = normalizeImportedChartValue(value)
      if (parsed === null) {
        return null
      }

      const normalizedColor = String(color || '').trim()
      return {
        label: String(label).trim(),
        value: parsed,
        color:
          /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizedColor)
            ? normalizedColor
            : chartPalette[index % chartPalette.length],
      }
    })
    .filter(Boolean)

  if (!preparedRows.length) {
    return []
  }

  const firstValue = normalizeImportedChartValue(rows[0]?.[1])
  const items = (firstValue === null ? preparedRows.slice(1) : preparedRows) as Array<{
    label: string
    value: number
    color: string
  }>

  return items.length ? items : (preparedRows as Array<{ label: string; value: number; color: string }>)
}

const importChartItemsFromClipboardText = (value: string) => {
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t'))

  const preparedRows = rows
    .map((row) => [row?.[0], row?.[1], row?.[2]] as const)
    .filter(([label, value]) => String(label || '').trim() && value !== '')
    .map(([label, value, color], index) => {
      const parsed = normalizeImportedChartValue(value)
      if (parsed === null) {
        return null
      }

      const normalizedColor = String(color || '').trim()
      return {
        label: String(label).trim(),
        value: parsed,
        color:
          /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizedColor)
            ? normalizedColor
            : chartPalette[index % chartPalette.length],
      }
    })
    .filter(Boolean) as Array<{ label: string; value: number; color: string }>

  if (!preparedRows.length) {
    return []
  }

  const firstValue = normalizeImportedChartValue(rows[0]?.[1])
  const items = firstValue === null ? preparedRows.slice(1) : preparedRows
  return items.length ? items : preparedRows
}

export const SettingsPanel = ({
  block,
  settings,
  onUpdateBlock,
  onUpdateSettings,
}: SettingsPanelProps) => {
  const [columnCountInput, setColumnCountInput] = useState('')

  useEffect(() => {
    if (block?.type === 'columns') {
      setColumnCountInput(String(block.data.count))
      return
    }

    setColumnCountInput('')
  }, [block])

  const blockTitle = useMemo(() => {
    if (!block) {
      return 'Настройки страницы'
    }

    const map: Record<ArticleBlock['type'], string> = {
      hero: 'Заголовок',
      newsIntro: 'Новостной блок',
      richText: 'Текст',
      callout: 'Плашка',
      important: 'Важно',
      quote: 'Цитата',
      background: 'Блок с фоном',
      divider: 'Разделитель',
      button: 'Кнопка',
      table: 'Таблица',
      columns: '2-3 колонки',
      cards: 'Карточки',
      image: 'Изображение',
      stats: 'Статистика',
      chart: 'Диаграмма',
    }

    return map[block.type]
  }, [block])

  const updateSpacing = (key: 'marginTop' | 'marginBottom', value: number) => {
    if (!block) {
      return
    }

    onUpdateBlock({
      ...block,
      spacing: {
        ...block.spacing,
        [key]: value,
      },
    })
  }

  const renderAlignSelect = (value: TextAlign, onChange: (align: TextAlign) => void) => (
    <label>
      Выравнивание
      <select value={value} onChange={(event) => onChange(event.target.value as TextAlign)}>
        {alignOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )

  const applyColumnCountInput = () => {
    if (!block || block.type !== 'columns') {
      return
    }

    const count = clampColumnCount(number(columnCountInput.trim(), block.data.count))
    const columns = [...block.data.columns]

    while (columns.length < count) {
      columns.push(createColumnItem(columns.length))
    }

    onUpdateBlock({
      ...block,
      data: {
        ...block.data,
        count,
        columns: columns.slice(0, count),
      },
    })

    setColumnCountInput(String(count))
  }

  const renderGlobalSettings = () => (
    <div className="settings-stack">
      <label>
        Ширина страницы
        <input
          type="number"
          min={720}
          max={1400}
          value={settings.pageWidth}
          onChange={(event) =>
            onUpdateSettings({ ...settings, pageWidth: number(event.target.value, settings.pageWidth) })
          }
        />
      </label>

      <label>
        Базовый размер шрифта
        <input
          type="number"
          min={14}
          max={22}
          value={settings.baseFontSize}
          onChange={(event) =>
            onUpdateSettings({
              ...settings,
              baseFontSize: number(event.target.value, settings.baseFontSize),
            })
          }
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.includeImagesAsBase64}
          onChange={(event) =>
            onUpdateSettings({
              ...settings,
              includeImagesAsBase64: event.target.checked,
            })
          }
        />
        Встраивать локальные изображения в экспорт
      </label>
    </div>
  )

  const renderCommonSpacing = () => {
    if (!block) {
      return null
    }

    return (
      <section className="settings-section">
        <h4>Отступы блока</h4>
        <label>
          Отступ сверху: {block.spacing.marginTop}px
          <input
            type="range"
            min={0}
            max={80}
            value={block.spacing.marginTop}
            onChange={(event) => updateSpacing('marginTop', number(event.target.value, 0))}
          />
        </label>
        <label>
          Отступ снизу: {block.spacing.marginBottom}px
          <input
            type="range"
            min={0}
            max={80}
            value={block.spacing.marginBottom}
            onChange={(event) => updateSpacing('marginBottom', number(event.target.value, 0))}
          />
        </label>
      </section>
    )
  }

  const renderBlockSettings = () => {
    if (!block) {
      return renderGlobalSettings()
    }

    if ((block as ArticleBlock).type === 'chart') {
      const chartBlock = block as Extract<ArticleBlock, { type: 'chart' }>
      const chartData = chartBlock.data

      return (
        <div className="settings-stack">
          <label>
            Заголовок
            <input
              value={chartData.title}
              onChange={(event) =>
                onUpdateBlock({
                  ...chartBlock,
                  data: {
                    ...chartData,
                    title: event.target.value,
                    titleHtml: `<h3>${event.target.value}</h3>`,
                  },
                })
              }
            />
          </label>

          <label>
            Описание
            <textarea
              rows={3}
              value={chartData.description}
              onChange={(event) =>
                onUpdateBlock({
                  ...chartBlock,
                  data: {
                    ...chartData,
                    description: event.target.value,
                    descriptionHtml: `<p>${event.target.value}</p>`,
                  },
                })
              }
            />
          </label>

          <div className="settings-inline-card settings-item-card">
            <label>
              Максимум шкалы
              <input
                type="number"
                min={1}
                disabled={chartData.importSource === 'excel'}
                value={chartData.max}
                onChange={(event) =>
                  onUpdateBlock({
                    ...chartBlock,
                    data: {
                      ...chartData,
                      max: Math.max(1, number(event.target.value, chartData.max)),
                    },
                  })
                }
              />
            </label>

            <label>
              Выравнивание
              <select
                value={chartData.align || 'left'}
                onChange={(event) =>
                  onUpdateBlock({
                    ...chartBlock,
                    data: {
                      ...chartData,
                      align: event.target.value as 'left' | 'center' | 'right',
                    },
                  })
                }
              >
                <option value="left">Слева</option>
                <option value="center">По центру</option>
                <option value="right">Справа</option>
              </select>
            </label>

            <label className="checkbox-row settings-checkbox-card">
              <input
                type="checkbox"
                checked={chartData.showValues ?? true}
                onChange={(event) =>
                  onUpdateBlock({
                    ...chartBlock,
                    data: {
                      ...chartData,
                      showValues: event.target.checked,
                    },
                  })
                }
              />
              Показывать значения
            </label>

            <div className="chart-import-actions">
              <label className="chart-import-button settings-action-button">
                Импорт файла
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.svg,.png,.jpg,.jpeg,.webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) {
                      return
                    }

                    try {
                      const fileName = file.name.toLowerCase()
                      const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(fileName)
                      const isImageFile =
                        file.type.startsWith('image/') ||
                        /\.(svg|png|jpe?g|webp)$/i.test(fileName)

                      if (isSpreadsheet) {
                        const imported = await importSpreadsheetFile(file)
                        if (!imported) {
                          window.alert('Не удалось распознать данные файла.')
                          return
                        }

                        if (imported.kind === 'chart') {
                          onUpdateBlock({
                            ...chartBlock,
                            data: {
                              ...chartData,
                              importSource: 'excel',
                              imageSrc: renderChartItemsToSvgDataUrl(imported.items),
                              imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Диаграмма',
                              items: imported.items,
                              max: imported.max,
                              tableHeaders: [],
                              tableRows: [],
                            },
                          })
                        } else {
                          onUpdateBlock({
                            ...chartBlock,
                            data: {
                              ...chartData,
                              importSource: 'excel',
                              imageSrc: renderTableToSvgDataUrl(imported.headers, imported.rows),
                              imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Таблица',
                              tableHeaders: imported.headers,
                              tableRows: imported.rows,
                            },
                          })
                        }

                        return
                      }

                      if (isImageFile) {
                        const src = await readImageAsDataUrl(file)
                        onUpdateBlock({
                          ...chartBlock,
                          data: {
                            ...chartData,
                            importSource: 'image',
                            imageSrc: src,
                            imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Диаграмма',
                            tableHeaders: [],
                            tableRows: [],
                          },
                        })
                        return
                      }

                      window.alert('Поддерживаются Excel, CSV и изображения.')
                    } finally {
                      event.target.value = ''
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )
    }

    if ((block as ArticleBlock).type === 'quote') {
      const quoteBlock = block as Extract<ArticleBlock, { type: 'quote' }>

      return (
        <div className="settings-stack">
          <label>
            Цвет акцента
            <input
              type="color"
              value={quoteBlock.data.accentColor || '#1e67dc'}
              onChange={(event) =>
                onUpdateBlock({
                  ...quoteBlock,
                  data: { ...quoteBlock.data, accentColor: event.target.value },
                })
              }
            />
          </label>

          <label>
            Ширина блока: {quoteBlock.data.width || 100}%
            <input
              type="range"
              min={40}
              max={100}
              value={quoteBlock.data.width || 100}
              onChange={(event) =>
                onUpdateBlock({
                  ...quoteBlock,
                  data: {
                    ...quoteBlock.data,
                    width: number(event.target.value, quoteBlock.data.width),
                  },
                })
              }
            />
          </label>

          <label>
            Высота блока: {quoteBlock.data.minHeight || 140}px
            <input
              type="range"
              min={80}
              max={520}
              value={quoteBlock.data.minHeight || 140}
              onChange={(event) =>
                onUpdateBlock({
                  ...quoteBlock,
                  data: {
                    ...quoteBlock.data,
                    minHeight: number(event.target.value, quoteBlock.data.minHeight),
                  },
                })
              }
            />
          </label>

          <p className="settings-tip">Текст, автор и источник редактируются прямо внутри блока через кнопку `...`.</p>
        </div>
      )
    }

    const isQuoteBlock = block.type === 'quote'
    const isChartBlock = block.type === 'chart'
    let customSettings: ReturnType<typeof renderGlobalSettings> | null = null

    if (isQuoteBlock) {
      const quoteBlock = block as Extract<ArticleBlock, { type: 'quote' }>
      customSettings = (
        <div className="settings-stack">
          <label>
            Автор
            <input
              value={quoteBlock.data.author}
              onChange={(event) =>
                onUpdateBlock({
                  ...quoteBlock,
                  data: { ...quoteBlock.data, author: event.target.value },
                })
              }
            />
          </label>

          <label>
            Источник
            <input
              value={quoteBlock.data.source}
              onChange={(event) =>
                onUpdateBlock({
                  ...quoteBlock,
                  data: { ...quoteBlock.data, source: event.target.value },
                })
              }
            />
          </label>

          <p className="settings-tip">Текст цитаты редактируется прямо в блоке через кнопку `...`.</p>
        </div>
      )
    }

    if (isChartBlock) {
      const chartBlock = block as Extract<ArticleBlock, { type: 'chart' }>
      const chartData = chartBlock.data
      customSettings = (
        <div className="settings-stack">
          <label>
            Заголовок
            <input
              value={chartData.title}
              onChange={(event) =>
                onUpdateBlock({
                  ...chartBlock,
                  data: {
                    ...chartData,
                    title: event.target.value,
                    titleHtml: `<h3>${event.target.value}</h3>`,
                  },
                })
              }
            />
          </label>

          <label>
            Описание
            <textarea
              rows={3}
              value={chartData.description}
              onChange={(event) =>
                onUpdateBlock({
                  ...chartBlock,
                  data: {
                    ...chartData,
                    description: event.target.value,
                    descriptionHtml: `<p>${event.target.value}</p>`,
                  },
                })
              }
            />
          </label>

          <div className="settings-inline-card settings-item-card chart-settings-simple">
            <div className="settings-compact-grid">
              <label>
                Вид диаграммы
                <select
                  value={chartData.chartType || 'bar'}
                  onChange={(event) =>
                    onUpdateBlock({
                      ...chartBlock,
                      data: {
                        ...chartData,
                        chartType: event.target.value as ChartType,
                      },
                    })
                  }
                >
                  {chartTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Высота: {chartData.height || 240}px
                <input
                  type="range"
                  min={180}
                  max={420}
                  value={chartData.height || 240}
                  onChange={(event) =>
                    onUpdateBlock({
                      ...chartBlock,
                      data: {
                        ...chartData,
                        height: number(event.target.value, chartData.height || 240),
                      },
                    })
                  }
                />
              </label>
            </div>

            <div className="settings-compact-grid">
              <label className="checkbox-row chart-setting-hidden">
                <input
                  type="checkbox"
                  checked={chartData.autoMax ?? false}
                  onChange={(event) =>
                    onUpdateBlock({
                      ...chartBlock,
                      data: {
                        ...chartData,
                        autoMax: event.target.checked,
                      },
                    })
                  }
                />
                Автомасштаб
              </label>

              <label>
                Максимум шкалы
                <input
                  type="number"
                  min={1}
                  disabled={chartData.importSource === 'excel'}
                  value={chartData.max}
                  onChange={(event) =>
                    onUpdateBlock({
                      ...chartBlock,
                      data: {
                        ...chartData,
                        max: Math.max(1, number(event.target.value, chartData.max)),
                      },
                    })
                  }
                />
              </label>
            </div>

            <div className="settings-compact-grid">
              <label>
                Положение легенды
                <select
                  value={chartData.align || 'left'}
                  onChange={(event) =>
                    onUpdateBlock({
                      ...chartBlock,
                      data: {
                        ...chartData,
                        align: event.target.value as 'left' | 'center' | 'right',
                      },
                    })
                  }
                >
                  <option value="left">Слева</option>
                  <option value="center">По центру</option>
                  <option value="right">Справа</option>
                </select>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={chartData.showValues ?? true}
                  onChange={(event) =>
                    onUpdateBlock({
                      ...chartBlock,
                      data: {
                        ...chartData,
                        showValues: event.target.checked,
                      },
                    })
                  }
                />
                Показывать значения
              </label>

              <label className="checkbox-row chart-setting-hidden">
                <input
                  type="checkbox"
                  checked={chartData.showGrid ?? true}
                  onChange={(event) =>
                    onUpdateBlock({
                      ...chartBlock,
                      data: {
                        ...chartData,
                        showGrid: event.target.checked,
                      },
                    })
                  }
                />
                Показывать сетку
              </label>
            </div>

            <div className="chart-import-actions">
            <label className="chart-import-button settings-action-button">
              Импорт файла
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.svg,.png,.jpg,.jpeg,.webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) {
                    return
                  }

                  const fileName = file.name.toLowerCase()
                  const isImageFile =
                    file.type.startsWith('image/') ||
                    /\.(svg|png|jpe?g|webp)$/i.test(fileName)

                  if (!isImageFile) {
                    const imported = await importSpreadsheetFile(file)
                    if (!imported) {
                      event.target.value = ''
                      return
                    }

                    if (imported.kind === 'chart') {
                      onUpdateBlock({
                        ...chartBlock,
                        data: {
                          ...chartData,
                          importSource: 'excel',
                          imageSrc: renderChartItemsToSvgDataUrl(imported.items, {
                            title: chartData.title,
                            subtitle: chartData.description,
                          }),
                          imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Диаграмма',
                          items: imported.items,
                          max: imported.max,
                          tableHeaders: [],
                          tableRows: [],
                        },
                      })
                    } else {
                      onUpdateBlock({
                        ...chartBlock,
                        data: {
                          ...chartData,
                          importSource: 'excel',
                          imageSrc: renderTableToSvgDataUrl(imported.headers, imported.rows, {
                            title: chartData.title,
                            subtitle: chartData.description,
                          }),
                          imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Таблица',
                          tableHeaders: imported.headers,
                          tableRows: imported.rows,
                        },
                      })
                    }

                    event.target.value = ''
                    return
                  }

                  const src = await readImageAsDataUrl(file)

                  onUpdateBlock({
                    ...chartBlock,
                    data: {
                      ...chartData,
                      importSource: 'image',
                      imageSrc: src,
                      imageAlt: file.name.replace(/\.[^.]+$/, '') || 'Диаграмма',
                    },
                  })

                  event.target.value = ''
                }}
              />
            </label>
            <button
              type="button"
              className="settings-action-button"
              onClick={() => {
                const pasted = window.prompt('Скопируйте диапазон в Excel и вставьте сюда (Ctrl+V)')
                if (!pasted) {
                  return
                }

                const items = importChartItemsFromClipboardText(pasted)
                if (!items.length) {
                  window.alert('Не удалось распознать данные Excel.')
                  return
                }

                onUpdateBlock({
                  ...chartBlock,
                  data: {
                    ...chartData,
                    importSource: 'excel',
                    items,
                    max: Math.max(1, ...items.map((item) => item.value)),
                  },
                })
              }}
            >
              Вставить из Excel
            </button>
            </div>
          </div>

          <div className="settings-inline-card settings-item-card chart-table-card chart-setting-hidden">
            <div className="settings-item-head">
              <strong>Данные диаграммы</strong>
                <label className="chart-import-button">
                  Импорт Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) {
                        return
                      }

                      const items = await importChartItemsFromFile(file)
                      if (!items.length) {
                        event.target.value = ''
                        return
                      }

                      onUpdateBlock({
                        ...chartBlock,
                        data: {
                          ...chartData,
                          importSource: 'excel',
                          chartType: 'bar',
                          items,
                          max: Math.max(1, ...items.map((item) => item.value)),
                        },
                      })

                      event.target.value = ''
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBlock({
                    ...chartBlock,
                    data: {
                      ...chartData,
                      items: [...chartData.items, createChartItem()],
                    },
                  })
                }
              >
                Добавить строку
              </button>
            </div>

            <div className="chart-data-table">
              <div className="chart-data-head">
                <span>Подпись</span>
                <span>Значение</span>
                <span>Цвет</span>
                <span>Действия</span>
              </div>

              {chartData.items.map((item, index) => (
                <div key={`${chartBlock.id}-${index}`} className="chart-data-row">
                  <input
                    value={item.label}
                    onChange={(event) => {
                      const items = [...chartData.items]
                      items[index] = { ...items[index], label: event.target.value }
                      onUpdateBlock({ ...chartBlock, data: { ...chartData, items } })
                    }}
                  />

                  <input
                    type="number"
                    value={item.value}
                    onChange={(event) => {
                      const items = [...chartData.items]
                      items[index] = { ...items[index], value: number(event.target.value, item.value) }
                      onUpdateBlock({ ...chartBlock, data: { ...chartData, items } })
                    }}
                  />

                  <input
                    className="chart-color-input"
                    type="color"
                    value={item.color}
                    onChange={(event) => {
                      const items = [...chartData.items]
                      items[index] = { ...items[index], color: event.target.value }
                      onUpdateBlock({ ...chartBlock, data: { ...chartData, items } })
                    }}
                  />

                  <div className="chart-row-actions">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBlock({
                          ...chartBlock,
                          data: {
                            ...chartData,
                            items: moveItem(chartData.items, index, index - 1),
                          },
                        })
                      }
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBlock({
                          ...chartBlock,
                          data: {
                            ...chartData,
                            items: moveItem(chartData.items, index, index + 1),
                          },
                        })
                      }
                      disabled={index === chartData.items.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBlock({
                          ...chartBlock,
                          data: {
                            ...chartData,
                            items: chartData.items.filter((_, itemIndex) => itemIndex !== index),
                          },
                        })
                      }
                      disabled={chartData.items.length <= 1}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (customSettings) {
      return customSettings
    }

    switch (block.type) {
      case 'hero': {
        const previewBackground = buildHeroBackground(block.data)

        return (
          <div className="settings-stack">
            <label>
              Заголовок
              <textarea
                rows={3}
                value={block.data.title}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: event.target.value } })
                }
              />
            </label>

            <label>
              Подзаголовок
              <textarea
                rows={3}
                value={block.data.subtitle}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, subtitle: event.target.value } })
                }
              />
            </label>

            {renderAlignSelect(block.data.align, (align) =>
              onUpdateBlock({ ...block, data: { ...block.data, align } }),
            )}

            <div className="settings-inline-card rgb-panel">
              <div className="rgb-panel-header">
                <strong>Фон блока</strong>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    if (block.data.backgroundEnabled) {
                      onUpdateBlock({
                        ...block,
                        data: { ...block.data, backgroundEnabled: false, textColor: '#1b2438' },
                      })
                      return
                    }

                    const defaults = createDefaultHeroBackground()
                    onUpdateBlock({
                      ...block,
                      data: {
                        ...block.data,
                        backgroundEnabled: true,
                        backgroundColorA: defaults.colorA,
                        backgroundColorB: defaults.colorB,
                        backgroundAngle: defaults.angle,
                        backgroundStopA: defaults.stopA,
                        backgroundStopB: defaults.stopB,
                        textColor: '#ffffff',
                      },
                    })
                  }}
                >
                  {block.data.backgroundEnabled ? 'Без фона' : 'Создать свой фон'}
                </button>
              </div>

              {block.data.backgroundEnabled && (
                <>
                  <div className="rgb-preview gradient-preview" style={{ background: previewBackground }} />

                  <div className="gradient-color-row">
                    <label>
                      Первый цвет
                      <input
                        type="color"
                        value={block.data.backgroundColorA}
                        onChange={(event) =>
                          onUpdateBlock({
                            ...block,
                            data: { ...block.data, backgroundColorA: event.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      Второй цвет
                      <input
                        type="color"
                        value={block.data.backgroundColorB}
                        onChange={(event) =>
                          onUpdateBlock({
                            ...block,
                            data: { ...block.data, backgroundColorB: event.target.value },
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="gradient-direction-grid">
                    {heroGradientDirections.map((direction) => (
                      <button
                        key={direction.value}
                        type="button"
                        className={block.data.backgroundAngle === direction.value ? 'is-active' : ''}
                        onClick={() =>
                          onUpdateBlock({
                            ...block,
                            data: { ...block.data, backgroundAngle: direction.value },
                          })
                        }
                      >
                        {direction.label}
                      </button>
                    ))}
                  </div>

                  <label>
                    Смещение первого цвета: {block.data.backgroundStopA}%
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={block.data.backgroundStopA}
                      onChange={(event) =>
                        onUpdateBlock({
                          ...block,
                          data: { ...block.data, backgroundStopA: number(event.target.value, 0) },
                        })
                      }
                    />
                  </label>

                  <label>
                    Смещение второго цвета: {block.data.backgroundStopB}%
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={block.data.backgroundStopB}
                      onChange={(event) =>
                        onUpdateBlock({
                          ...block,
                          data: { ...block.data, backgroundStopB: number(event.target.value, 100) },
                        })
                      }
                    />
                  </label>
                </>
              )}
            </div>

            <label>
              Цвет текста
              <input
                type="color"
                value={block.data.textColor}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, textColor: event.target.value } })
                }
              />
            </label>
          </div>
        )
      }

      case 'newsIntro':
        return (
          <div className="settings-stack">
            <label>
              Заголовок
              <textarea
                rows={2}
                value={block.data.title}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: event.target.value } })
                }
              />
            </label>

            <label>
              Подзаголовок
              <textarea
                rows={3}
                value={block.data.subtitle}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, subtitle: event.target.value } })
                }
              />
            </label>

            {renderAlignSelect(block.data.align, (align) =>
              onUpdateBlock({ ...block, data: { ...block.data, align } }),
            )}

            <p className="settings-tip">Лид редактируется прямо в блоке на холсте.</p>
          </div>
        )

      case 'richText':
        return (
          <div className="settings-stack">
            {renderAlignSelect(block.data.align, (align) =>
              onUpdateBlock({ ...block, data: { ...block.data, align } }),
            )}

            <label>
              Размер шрифта
              <input
                type="number"
                min={14}
                max={36}
                value={block.data.fontSize}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, fontSize: number(event.target.value, block.data.fontSize) },
                  })
                }
              />
            </label>

            <label>
              Интервал между абзацами
              <input
                type="number"
                min={0}
                max={40}
                value={block.data.paragraphGap}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      paragraphGap: number(event.target.value, block.data.paragraphGap),
                    },
                  })
                }
              />
            </label>
          </div>
        )

      case 'callout':
        return (
          <div className="settings-stack">
            <label>
              Заголовок
              <input
                value={block.data.title}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: event.target.value } })
                }
              />
            </label>

            <label>
              Текст
              <textarea
                rows={4}
                value={block.data.content}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, content: event.target.value } })
                }
              />
            </label>

            <label>
              Тип плашки
              <select
                value={block.data.tone}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      tone: event.target.value as typeof block.data.tone,
                    },
                  })
                }
              >
                <option value="info">Инфо</option>
                <option value="success">Успех</option>
                <option value="warning">Предупреждение</option>
                <option value="danger">Опасность</option>
              </select>
            </label>
          </div>
        )

      case 'important':
        return (
          <div className="settings-stack">
            <label>
              Заголовок
              <input
                value={block.data.title}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: event.target.value } })
                }
              />
            </label>

            <label>
              Текст
              <textarea
                rows={4}
                value={block.data.content}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, content: event.target.value } })
                }
              />
            </label>
          </div>
        )

      case 'quote':
        return (
          <div className="settings-stack">
            <label>
              Цитата
              <textarea
                rows={5}
                value={block.data.html || block.data.quote}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      quote: event.target.value,
                      html: `<p>${event.target.value}</p>`,
                    },
                  })
                }
              />
            </label>

            <label>
              Автор
              <input
                value={block.data.author}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, author: event.target.value } })
                }
              />
            </label>

            <label>
              Источник
              <input
                value={block.data.source}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, source: event.target.value } })
                }
              />
            </label>
          </div>
        )

      case 'background':
        return (
          <div className="settings-stack">
            <label>
              Заголовок
              <input
                value={block.data.title}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: event.target.value } })
                }
              />
            </label>

            <label>
              Фон блока
              <input
                value={block.data.background}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, background: event.target.value } })
                }
              />
            </label>

            <label>
              Цвет текста
              <input
                type="color"
                value={block.data.textColor}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, textColor: event.target.value } })
                }
              />
            </label>

            <p className="settings-tip">Содержимое блока редактируется прямо на холсте.</p>
          </div>
        )

      case 'divider':
        return (
          <div className="settings-stack">
            <label>
              Подпись
              <input
                value={block.data.label}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, label: event.target.value } })
                }
              />
            </label>

            <label>
              Цвет линии
              <input
                type="color"
                value={block.data.color}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, color: event.target.value } })
                }
              />
            </label>

            <label>
              Стиль
              <select
                value={block.data.style}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      style: event.target.value as typeof block.data.style,
                    },
                  })
                }
              >
                <option value="solid">Сплошной</option>
                <option value="dashed">Пунктир</option>
                <option value="thick">Толстый</option>
              </select>
            </label>
          </div>
        )

      case 'button':
        return (
          <div className="settings-stack">
            <label>
              Текст кнопки
              <input
                value={block.data.label}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, label: event.target.value } })
                }
              />
            </label>

            <label>
              Ссылка
              <input
                value={block.data.url}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, url: event.target.value } })
                }
              />
            </label>

            {renderAlignSelect(block.data.align, (align) =>
              onUpdateBlock({ ...block, data: { ...block.data, align } }),
            )}

            <label>
              Стиль кнопки
              <select
                value={block.data.variant}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      variant: event.target.value as typeof block.data.variant,
                    },
                  })
                }
              >
                <option value="primary">Основная</option>
                <option value="secondary">Вторичная</option>
                <option value="ghost">Без заливки</option>
              </select>
            </label>
          </div>
        )

      case 'table':
        return (
          <div className="settings-stack">
            <label>
              Подпись таблицы
              <input
                value={block.data.caption}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, caption: event.target.value } })
                }
              />
            </label>

            <label>
              Заголовки столбцов
              <textarea
                rows={Math.max(3, block.data.headers.length)}
                value={block.data.headers.join('\n')}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      headers: splitLines(event.target.value),
                    },
                  })
                }
              />
            </label>

            <label>
              Строки таблицы
              <textarea
                rows={Math.max(4, block.data.rows.length + 1)}
                value={joinRows(block.data.rows)}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      rows: splitRows(event.target.value),
                    },
                  })
                }
              />
            </label>

            <p className="settings-tip">Каждая строка таблицы с новой строки, ячейки разделяйте символом |.</p>
          </div>
        )

      case 'columns': {
        return (
          <div className="settings-stack">
            <label>
              Количество колонок
              <input
                type="text"
                inputMode="numeric"
                value={columnCountInput}
                onChange={(event) =>
                  setColumnCountInput(event.target.value.replace(/[^\d]/g, ''))
                }
                onBlur={applyColumnCountInput}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyColumnCountInput()
                  }
                }}
              />
            </label>

            <label>
              Ширина всех колонок: {block.data.columnWidth}px
              <input
                type="range"
                min={MIN_COLUMN_WIDTH}
                max={MAX_COLUMN_WIDTH}
                value={block.data.columnWidth}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      columnWidth: clampColumnWidth(
                        number(event.target.value, block.data.columnWidth),
                      ),
                    },
                  })
                }
              />
            </label>

            <label>
              Высота всех колонок: {block.data.columnHeight > 0 ? `${block.data.columnHeight}px` : 'auto'}
              <input
                type="range"
                min={MIN_COLUMN_HEIGHT}
                max={MAX_COLUMN_HEIGHT}
                value={block.data.columnHeight}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      columnHeight: clampColumnHeight(
                        number(event.target.value, block.data.columnHeight),
                      ),
                    },
                  })
                }
              />
            </label>

            <div className="settings-item-head">
              <strong>Общие размеры</strong>
              <button
                type="button"
                onClick={() =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      columnWidth: DEFAULT_COLUMN_WIDTH,
                      columnHeight: DEFAULT_COLUMN_HEIGHT,
                    },
                  })
                }
              >
                Default
              </button>
            </div>

          </div>
        )
      }

      case 'cards':
        return (
          <div className="settings-stack">
            <label>
              Карточек в ряд
              <select
                value={block.data.columns}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      columns: Number(event.target.value) as typeof block.data.columns,
                    },
                  })
                }
              >
                <option value={2}>2 карточки</option>
                <option value={3}>3 карточки</option>
              </select>
            </label>

            {block.data.cards.map((item, index) => (
              <div key={`${block.id}-${index}`} className="settings-inline-card settings-item-card">
                <div className="settings-item-head">
                  <strong>Карточка {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock({
                        ...block,
                        data: {
                          ...block.data,
                          cards: block.data.cards.filter((_, itemIndex) => itemIndex !== index),
                        },
                      })
                    }
                    disabled={block.data.cards.length <= 1}
                  >
                    Удалить
                  </button>
                </div>

                <label>
                  Показатель
                  <input
                    value={item.stat || ''}
                    onChange={(event) => {
                      const cards = [...block.data.cards]
                      cards[index] = { ...cards[index], stat: event.target.value }
                      onUpdateBlock({ ...block, data: { ...block.data, cards } })
                    }}
                  />
                </label>

                <label>
                  Заголовок
                  <input
                    value={item.title || ''}
                    onChange={(event) => {
                      const cards = [...block.data.cards]
                      cards[index] = { ...cards[index], title: event.target.value }
                      onUpdateBlock({ ...block, data: { ...block.data, cards } })
                    }}
                  />
                </label>

                <label>
                  Текст
                  <textarea
                    rows={4}
                    value={item.content || ''}
                    onChange={(event) => {
                      const cards = [...block.data.cards]
                      cards[index] = { ...cards[index], content: event.target.value }
                      onUpdateBlock({ ...block, data: { ...block.data, cards } })
                    }}
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              className="settings-action-button"
              onClick={() =>
                onUpdateBlock({
                  ...block,
                  data: {
                    ...block.data,
                    cards: [...block.data.cards, createCardItem()],
                  },
                })
              }
            >
              Добавить карточку
            </button>
          </div>
        )

      case 'image':
        return (
          <div className="settings-stack">
            <label>
              URL изображения
              <input
                value={block.data.src}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, src: event.target.value } })
                }
              />
            </label>

            <label>
              Загрузить файл
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) {
                    return
                  }

                  const src = await readImageAsDataUrl(file)
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      src,
                      alt: block.data.alt || file.name.replace(/\.[^.]+$/, ''),
                    },
                  })
                }}
              />
            </label>

            <button
              type="button"
              className="settings-action-button"
              disabled={!block.data.src.trim() || isEmbeddedImageSource(block.data.src)}
              onClick={async () => {
                try {
                  const src = await fetchImageAsDataUrl(block.data.src)
                  onUpdateBlock({ ...block, data: { ...block.data, src } })
                } catch {
                  window.alert(
                    'Не удалось встроить картинку по URL. Если внешний сайт блокирует скачивание, загрузите файл через поле выше.',
                  )
                }
              }}
            >
              Встроить URL в код
            </button>

            <p className="settings-tip">
              Загруженный файл автоматически превращается в код картинки внутри HTML. Для Bitrix это
              самый надёжный способ.
            </p>

            <label>
              Alt-текст
              <input
                value={block.data.alt}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, alt: event.target.value } })
                }
              />
            </label>

            <label>
              Подпись
              <input
                value={block.data.caption}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, caption: event.target.value } })
                }
              />
            </label>

            <label>
              Расположение картинки
              <select
                value={block.data.imageSide || 'left'}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, imageSide: event.target.value as 'left' | 'right' },
                  })
                }
              >
                <option value="left">Картинка слева, текст справа</option>
                <option value="right">Текст слева, картинка справа</option>
              </select>
            </label>

            <p className="settings-tip">Текст рядом с изображением редактируется прямо в блоке через кнопку `...`.</p>


            <label>
              Ширина изображения: {block.data.width}%
              <input
                type="range"
                min={20}
                max={100}
                value={block.data.width}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, width: number(event.target.value, block.data.width) },
                  })
                }
              />
            </label>

            {renderAlignSelect(block.data.align, (align) =>
              onUpdateBlock({ ...block, data: { ...block.data, align } }),
            )}

            <label>
              Скругление углов: {block.data.radius}px
              <input
                type="range"
                min={0}
                max={36}
                value={block.data.radius}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, radius: number(event.target.value, block.data.radius) },
                  })
                }
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={block.data.shadow}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, shadow: event.target.checked },
                  })
                }
              />
              Добавить тень
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={block.data.withPadding}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, withPadding: event.target.checked },
                  })
                }
              />
              Белая подложка
            </label>
          </div>
        )

      case 'stats':
        return (
          <div className="settings-stack">
            <label>
              Заголовок блока
              <input
                value={block.data.title}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: event.target.value } })
                }
              />
            </label>

            {block.data.items.map((item, index) => (
              <div key={`${block.id}-${index}`} className="settings-inline-card settings-item-card">
                <div className="settings-item-head">
                  <strong>Показатель {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock({
                        ...block,
                        data: {
                          ...block.data,
                          items: block.data.items.filter((_, itemIndex) => itemIndex !== index),
                        },
                      })
                    }
                    disabled={block.data.items.length <= 1}
                  >
                    Удалить
                  </button>
                </div>

                <label>
                  Значение
                  <input
                    value={item.value}
                    onChange={(event) => {
                      const items = [...block.data.items]
                      items[index] = { ...items[index], value: event.target.value }
                      onUpdateBlock({ ...block, data: { ...block.data, items } })
                    }}
                  />
                </label>

                <label>
                  Подпись
                  <input
                    value={item.label}
                    onChange={(event) => {
                      const items = [...block.data.items]
                      items[index] = { ...items[index], label: event.target.value }
                      onUpdateBlock({ ...block, data: { ...block.data, items } })
                    }}
                  />
                </label>

                <label>
                  Описание
                  <textarea
                    rows={3}
                    value={item.description}
                    onChange={(event) => {
                      const items = [...block.data.items]
                      items[index] = { ...items[index], description: event.target.value }
                      onUpdateBlock({ ...block, data: { ...block.data, items } })
                    }}
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              className="settings-action-button"
              onClick={() =>
                onUpdateBlock({
                  ...block,
                  data: {
                    ...block.data,
                    items: [...block.data.items, createStatItem()],
                  },
                })
              }
            >
              Добавить показатель
            </button>
          </div>
        )

      case 'chart':
        return (
          <div className="settings-stack">
            <label>
              Заголовок
              <input
                value={block.data.title}
                onChange={(event) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: event.target.value } })
                }
              />
            </label>

            <label>
              Описание
              <textarea
                rows={3}
                value={block.data.description}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, description: event.target.value },
                  })
                }
              />
            </label>

            <label>
              Максимум шкалы
              <input
                type="number"
                min={1}
                value={block.data.max}
                onChange={(event) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, max: Math.max(1, number(event.target.value, block.data.max)) },
                  })
                }
              />
            </label>

            {block.data.items.map((item, index) => (
              <div key={`${block.id}-${index}`} className="settings-inline-card settings-item-card">
                <div className="settings-item-head">
                  <strong>Столбец {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock({
                        ...block,
                        data: {
                          ...block.data,
                          items: block.data.items.filter((_, itemIndex) => itemIndex !== index),
                        },
                      })
                    }
                    disabled={block.data.items.length <= 1}
                  >
                    Удалить
                  </button>
                </div>

                <label>
                  Подпись
                  <input
                    value={item.label}
                    onChange={(event) => {
                      const items = [...block.data.items]
                      items[index] = { ...items[index], label: event.target.value }
                      onUpdateBlock({ ...block, data: { ...block.data, items } })
                    }}
                  />
                </label>

                <div className="settings-compact-grid">
                  <label>
                    Значение
                    <input
                      type="number"
                      value={item.value}
                      onChange={(event) => {
                        const items = [...block.data.items]
                        items[index] = { ...items[index], value: number(event.target.value, item.value) }
                        onUpdateBlock({ ...block, data: { ...block.data, items } })
                      }}
                    />
                  </label>

                  <label>
                    Цвет
                    <input
                      type="color"
                      value={item.color}
                      onChange={(event) => {
                        const items = [...block.data.items]
                        items[index] = { ...items[index], color: event.target.value }
                        onUpdateBlock({ ...block, data: { ...block.data, items } })
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="settings-action-button"
              onClick={() =>
                onUpdateBlock({
                  ...block,
                  data: {
                    ...block.data,
                    items: [...block.data.items, createChartItem()],
                  },
                })
              }
            >
              Добавить столбец
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <aside className="panel panel-right">
      <div className="panel-header">
        <h2>{blockTitle}</h2>
        <p>{block ? 'Выберите блок и меняйте параметры' : 'Общие настройки проекта'}</p>
      </div>
      {renderBlockSettings()}
      {renderCommonSpacing()}
    </aside>
  )
}
