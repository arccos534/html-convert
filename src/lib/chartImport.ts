import * as XLSX from 'xlsx'
import type { ChartItem } from '../types'

const chartPalette = ['#1f8efa', '#38bdf8', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5a4', '#8b5cf6']

const normalizeImportedChartValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const normalized = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeColor = (value: unknown, index: number) => {
  const normalized = String(value ?? '').trim()
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)
    ? normalized
    : chartPalette[index % chartPalette.length]
}

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const toSvgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

const wrapText = (value: string, maxChars: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (!words.length) {
    return ['']
  }

  const lines: string[] = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars || !current) {
      current = next
      return
    }

    lines.push(current)
    current = word
  })

  if (current) {
    lines.push(current)
  }

  return lines
}

const normalizeSheetRows = (rows: unknown[][]) => {
  const preparedRows = rows
    .map((row) => row.map((cell) => String(cell ?? '').replace(/\u00a0/g, ' ').trim()))
    .filter((row) => row.some((cell) => cell !== ''))

  if (!preparedRows.length) {
    return []
  }

  const usedColumns = Math.max(
    ...preparedRows.map((row) => {
      let lastIndex = -1
      row.forEach((cell, index) => {
        if (cell !== '') {
          lastIndex = index
        }
      })
      return lastIndex + 1
    }),
  )

  return preparedRows.map((row) =>
    Array.from({ length: usedColumns }, (_, index) => row[index] ?? ''),
  )
}

const findFirstNonEmptySheetRows = (workbook: XLSX.WorkBook) => {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: '',
    })
    const rows = normalizeSheetRows(rawRows)
    if (rows.length) {
      return { sheetName, rows }
    }
  }

  return null
}

const buildSingleSeriesChartItems = (rows: string[][]) => {
  const items: ChartItem[] = []

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const label = String(row[0] ?? '').trim()
    const valueRaw = row[1]
    const extraCells = row.slice(3).some((cell) => String(cell).trim() !== '')

    if (!label || extraCells) {
      return null
    }

    const value = normalizeImportedChartValue(valueRaw)
    if (value === null) {
      return null
    }

    items.push({
      label,
      value,
      color: normalizeColor(row[2], index),
    })
  }

  return items.length ? items : null
}

type MultiSeriesChart = {
  categories: string[]
  series: Array<{
    name: string
    color: string
    values: number[]
  }>
}

const buildMultiSeriesChart = (rows: string[][]): MultiSeriesChart | null => {
  if (rows.length < 2 || rows[0].length < 3) {
    return null
  }

  const headers = rows[0]
  const body = rows.slice(1)
  const numericColumnIndexes = headers
    .map((_, index) => index)
    .filter((index) => index > 0)
    .filter((index) => body.some((row) => normalizeImportedChartValue(row[index]) !== null))

  if (!numericColumnIndexes.length) {
    return null
  }

  const categories = body.map((row) => String(row[0] ?? '').trim()).filter(Boolean)
  if (categories.length !== body.length) {
    return null
  }

  const series = numericColumnIndexes.map((columnIndex, index) => {
    const values = body.map((row) => normalizeImportedChartValue(row[columnIndex]) ?? 0)
    return {
      name: String(headers[columnIndex] ?? `Серия ${index + 1}`).trim() || `Серия ${index + 1}`,
      color: chartPalette[index % chartPalette.length],
      values,
    }
  })

  return series.length ? { categories, series } : null
}

export type SpreadsheetImportResult =
  | { kind: 'chart'; items: ChartItem[]; max: number; svgDataUrl?: string }
  | { kind: 'table'; headers: string[]; rows: string[][]; svgDataUrl?: string }

export const importSpreadsheetFile = async (
  file: File,
): Promise<SpreadsheetImportResult | null> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetData = findFirstNonEmptySheetRows(workbook)
  if (!sheetData) {
    return null
  }

  const { rows } = sheetData

  const headerLike =
    rows.length > 1 &&
    normalizeImportedChartValue(rows[0]?.[1]) === null &&
    normalizeImportedChartValue(rows[1]?.[1]) !== null

  const chartRows = headerLike ? rows.slice(1) : rows
  const singleSeriesItems = buildSingleSeriesChartItems(chartRows)

  if (singleSeriesItems?.length) {
    return {
      kind: 'chart',
      items: singleSeriesItems,
      max: Math.max(1, ...singleSeriesItems.map((item) => item.value)),
    }
  }

  const multiSeriesChart = buildMultiSeriesChart(rows)
  if (multiSeriesChart) {
    return {
      kind: 'chart',
      items: multiSeriesChart.categories.map((label, index) => ({
        label,
        value: Math.max(...multiSeriesChart.series.map((series) => series.values[index] ?? 0), 0),
        color: multiSeriesChart.series[0]?.color || chartPalette[index % chartPalette.length],
      })),
      max: Math.max(1, ...multiSeriesChart.series.flatMap((series) => series.values)),
      svgDataUrl: renderMultiSeriesChartToSvgDataUrl(multiSeriesChart.categories, multiSeriesChart.series),
    }
  }

  const headers = rows[0]
  const bodyRows = rows.slice(1)

  return {
    kind: 'table',
    headers,
    rows: bodyRows,
  }
}

export const renderChartItemsToSvgDataUrl = (
  items: ChartItem[],
  options?: { title?: string; subtitle?: string },
) => {
  const title = options?.title?.trim() ?? ''
  const subtitle = options?.subtitle?.trim() ?? ''
  const width = 1120
  const paddingX = 40
  const cardRadius = 26
  const gap = 14
  const labelWidth = 120
  const valueWidth = 56
  const rowHeight = 46
  const barHeight = 18
  const titleLines = title ? wrapText(title, 48) : []
  const subtitleLines = subtitle ? wrapText(subtitle, 80) : []
  const titleHeight =
    titleLines.length * 36 + subtitleLines.length * 24 + (titleLines.length || subtitleLines.length ? 34 : 0)
  const chartTop = 38 + titleHeight
  const height = chartTop + items.length * rowHeight + 42
  const innerWidth = width - paddingX * 2
  const barWidth = innerWidth - labelWidth - valueWidth - gap * 2
  const maxValue = Math.max(1, ...items.map((item) => item.value))

  const titleText = titleLines.length
    ? `<text x="${paddingX}" y="56" fill="#142b4d" font-size="34" font-weight="700" font-family="Open Sans, Arial, sans-serif">${titleLines
        .map(
          (line, index) =>
            `<tspan x="${paddingX}" dy="${index === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`
    : ''

  const subtitleStartY = 56 + Math.max(0, (titleLines.length - 1) * 38) + (titleLines.length ? 28 : 0)
  const subtitleText = subtitleLines.length
    ? `<text x="${paddingX}" y="${subtitleStartY}" fill="#5e7190" font-size="20" font-weight="400" font-family="Open Sans, Arial, sans-serif">${subtitleLines
        .map(
          (line, index) =>
            `<tspan x="${paddingX}" dy="${index === 0 ? 0 : 26}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`
    : ''

  const rowsSvg = items
    .map((item, index) => {
      const y = chartTop + index * rowHeight
      const barX = paddingX + labelWidth + gap
      const percent = Math.max(0, Math.min(100, (item.value / maxValue) * 100))
      const filledWidth = Math.max(12, (barWidth * percent) / 100)

      return `
        <text x="${paddingX}" y="${y + 28}" fill="#46607f" font-size="18" font-weight="500" font-family="Open Sans, Arial, sans-serif">${escapeXml(item.label)}</text>
        <rect x="${barX}" y="${y + 12}" width="${barWidth}" height="${barHeight}" rx="999" fill="#e7eef9" />
        <rect x="${barX}" y="${y + 12}" width="${filledWidth}" height="${barHeight}" rx="999" fill="${escapeXml(item.color)}" />
        <text x="${barX + barWidth + gap}" y="${y + 28}" fill="#46607f" font-size="18" font-weight="500" font-family="Open Sans, Arial, sans-serif">${item.value}</text>
      `
    })
    .join('')

  return toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <rect width="${width}" height="${height}" rx="${cardRadius}" fill="#ffffff"/>
      ${titleText}
      ${subtitleText}
      ${rowsSvg}
    </svg>
  `)
}

const renderMultiSeriesChartToSvgDataUrl = (
  categories: string[],
  series: Array<{ name: string; color: string; values: number[] }>,
) => {
  const width = 1180
  const paddingLeft = 56
  const paddingRight = 40
  const paddingTop = 34
  const paddingBottom = 86
  const chartHeight = 320
  const legendHeight = 34
  const groupGap = 22
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values))
  const innerWidth = width - paddingLeft - paddingRight
  const groupWidth = Math.max(72, (innerWidth - groupGap * Math.max(0, categories.length - 1)) / Math.max(categories.length, 1))
  const barGap = 8
  const barWidth = Math.max(10, (groupWidth - barGap * Math.max(0, series.length - 1)) / Math.max(series.length, 1))
  const gridLines = 4

  const gridSvg = Array.from({ length: gridLines + 1 }, (_, index) => {
    const y = paddingTop + (chartHeight / gridLines) * index
    const value = Math.round(maxValue - (maxValue / gridLines) * index)
    return `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#e4edf9" stroke-width="1" />
      <text x="${paddingLeft - 10}" y="${y + 5}" fill="#7a8ca6" font-size="14" text-anchor="end" font-family="Open Sans, Arial, sans-serif">${value}</text>
    `
  }).join('')

  const barsSvg = categories
    .map((category, categoryIndex) => {
      const groupX = paddingLeft + categoryIndex * (groupWidth + groupGap)
      const categoryBars = series
        .map((seriesItem, seriesIndex) => {
          const value = seriesItem.values[categoryIndex] ?? 0
          const height = Math.max(4, (value / maxValue) * chartHeight)
          const x = groupX + seriesIndex * (barWidth + barGap)
          const y = paddingTop + chartHeight - height

          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="${escapeXml(seriesItem.color)}" />
          `
        })
        .join('')

      return `
        ${categoryBars}
        <text x="${groupX + groupWidth / 2}" y="${paddingTop + chartHeight + 24}" fill="#46607f" font-size="14" text-anchor="middle" font-family="Open Sans, Arial, sans-serif">${escapeXml(category)}</text>
      `
    })
    .join('')

  const legendSvg = series
    .map((seriesItem, index) => {
      const x = paddingLeft + index * 180
      const y = paddingTop + chartHeight + 50
      return `
        <circle cx="${x}" cy="${y}" r="8" fill="${escapeXml(seriesItem.color)}" />
        <text x="${x + 16}" y="${y + 5}" fill="#2e4669" font-size="15" font-family="Open Sans, Arial, sans-serif">${escapeXml(seriesItem.name)}</text>
      `
    })
    .join('')

  const height = paddingTop + chartHeight + paddingBottom + legendHeight

  return toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <rect width="${width}" height="${height}" rx="24" fill="#ffffff"/>
      ${gridSvg}
      ${barsSvg}
      ${legendSvg}
    </svg>
  `)
}

export const renderTableToSvgDataUrl = (
  headers: string[],
  rows: string[][],
  options?: { title?: string; subtitle?: string },
) => {
  const title = options?.title?.trim() ?? ''
  const subtitle = options?.subtitle?.trim() ?? ''
  const allRows = rows.length ? rows : [headers]
  const columnCount = Math.max(headers.length, ...allRows.map((row) => row.length))
  const normalizedHeaders = headers.length ? headers : Array.from({ length: columnCount }, () => '')
  const normalizedRows = rows.length ? rows : [headers]
  const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const cells = [
      normalizedHeaders[columnIndex] ?? '',
      ...normalizedRows.map((row) => row[columnIndex] ?? ''),
    ]
    const maxLength = Math.max(...cells.map((cell) => String(cell).length), 8)
    return Math.min(280, Math.max(140, maxLength * 8))
  })

  const paddingX = 32
  const width = paddingX * 2 + columnWidths.reduce((sum, value) => sum + value, 0)
  const titleLines = title ? wrapText(title, 70) : []
  const subtitleLines = subtitle ? wrapText(subtitle, 96) : []
  const titleHeight =
    titleLines.length * 34 + subtitleLines.length * 22 + (titleLines.length || subtitleLines.length ? 30 : 0)
  const headerTop = 32 + titleHeight
  let currentY = headerTop

  const renderCell = (
    value: string,
    x: number,
    y: number,
    widthValue: number,
    color: string,
    fontWeight: number,
  ) => {
    const maxChars = Math.max(8, Math.floor((widthValue - 24) / 8))
    const lines = wrapText(value, maxChars)
    return {
      height: Math.max(42, lines.length * 20 + 18),
      svg: `<text x="${x + 12}" y="${y + 24}" fill="${color}" font-size="16" font-weight="${fontWeight}" font-family="Open Sans, Arial, sans-serif">${lines
        .map(
          (line, index) =>
            `<tspan x="${x + 12}" dy="${index === 0 ? 0 : 20}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`,
    }
  }

  const titleText = titleLines.length
    ? `<text x="${paddingX}" y="48" fill="#142b4d" font-size="30" font-weight="700" font-family="Open Sans, Arial, sans-serif">${titleLines
        .map(
          (line, index) =>
            `<tspan x="${paddingX}" dy="${index === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`
    : ''

  const subtitleStartY = 48 + Math.max(0, (titleLines.length - 1) * 34) + (titleLines.length ? 24 : 0)
  const subtitleText = subtitleLines.length
    ? `<text x="${paddingX}" y="${subtitleStartY}" fill="#5e7190" font-size="18" font-weight="400" font-family="Open Sans, Arial, sans-serif">${subtitleLines
        .map(
          (line, index) =>
            `<tspan x="${paddingX}" dy="${index === 0 ? 0 : 24}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`
    : ''

  const headerCells = normalizedHeaders.map((header, columnIndex) =>
    renderCell(
      header,
      paddingX + columnWidths.slice(0, columnIndex).reduce((sum, value) => sum + value, 0),
      currentY,
      columnWidths[columnIndex],
      '#1e3f6d',
      700,
    ),
  )
  const headerHeight = Math.max(...headerCells.map((cell) => cell.height), 48)

  const headerSvg = `
    <rect x="${paddingX}" y="${currentY}" width="${width - paddingX * 2}" height="${headerHeight}" rx="16" fill="#eef4ff" />
    ${headerCells.map((cell) => cell.svg).join('')}
  `

  currentY += headerHeight + 8

  const bodyRowsSvg = normalizedRows
    .map((row, rowIndex) => {
      const rowCells = Array.from({ length: columnCount }, (_, columnIndex) =>
        renderCell(
          row[columnIndex] ?? '',
          paddingX + columnWidths.slice(0, columnIndex).reduce((sum, value) => sum + value, 0),
          currentY,
          columnWidths[columnIndex],
          '#314967',
          400,
        ),
      )
      const rowHeight = Math.max(...rowCells.map((cell) => cell.height), 42)
      const svg = `
        <rect x="${paddingX}" y="${currentY}" width="${width - paddingX * 2}" height="${rowHeight}" rx="14" fill="${rowIndex % 2 === 0 ? '#ffffff' : '#f8fbff'}" />
        ${rowCells.map((cell) => cell.svg).join('')}
      `
      currentY += rowHeight + 6
      return svg
    })
    .join('')

  const height = currentY + 26

  return toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <rect width="${width}" height="${height}" rx="24" fill="#ffffff"/>
      ${titleText}
      ${subtitleText}
      ${headerSvg}
      ${bodyRowsSvg}
    </svg>
  `)
}
