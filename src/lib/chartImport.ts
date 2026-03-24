import * as XLSX from 'xlsx'
import type { ChartItem } from '../types'

const chartPalette = ['#1f8efa', '#38bdf8', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed']

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

const buildChartItems = (rows: string[][]) => {
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

export type SpreadsheetImportResult =
  | { kind: 'chart'; items: ChartItem[]; max: number }
  | { kind: 'table'; headers: string[]; rows: string[][] }

export const importSpreadsheetFile = async (
  file: File,
): Promise<SpreadsheetImportResult | null> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return null
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: '',
  })

  const rows = normalizeSheetRows(rawRows)
  if (!rows.length) {
    return null
  }

  const headerLike =
    rows.length > 1 &&
    normalizeImportedChartValue(rows[0]?.[1]) === null &&
    normalizeImportedChartValue(rows[1]?.[1]) !== null

  const chartRows = headerLike ? rows.slice(1) : rows
  const chartItems = buildChartItems(chartRows)

  if (chartItems && chartItems.length) {
    return {
      kind: 'chart',
      items: chartItems,
      max: Math.max(1, ...chartItems.map((item) => item.value)),
    }
  }

  const headers = rows[0]
  const bodyRows = rows.slice(1)

  if (!bodyRows.length) {
    return {
      kind: 'table',
      headers,
      rows: [],
    }
  }

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
  const labelWidth = 108
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
    ? `<text x="${paddingX}" y="56" fill="#142b4d" font-size="34" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${titleLines
        .map(
          (line, index) =>
            `<tspan x="${paddingX}" dy="${index === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`
    : ''

  const subtitleStartY = 56 + Math.max(0, (titleLines.length - 1) * 38) + (titleLines.length ? 28 : 0)
  const subtitleText = subtitleLines.length
    ? `<text x="${paddingX}" y="${subtitleStartY}" fill="#5e7190" font-size="20" font-weight="400" font-family="Segoe UI, Arial, sans-serif">${subtitleLines
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
        <text x="${paddingX}" y="${y + 28}" fill="#46607f" font-size="18" font-weight="500" font-family="Segoe UI, Arial, sans-serif">${escapeXml(item.label)}</text>
        <rect x="${barX}" y="${y + 12}" width="${barWidth}" height="${barHeight}" rx="999" fill="#e7eef9" />
        <rect x="${barX}" y="${y + 12}" width="${filledWidth}" height="${barHeight}" rx="999" fill="${escapeXml(item.color)}" />
        <text x="${barX + barWidth + gap}" y="${y + 28}" fill="#46607f" font-size="18" font-weight="500" font-family="Segoe UI, Arial, sans-serif">${item.value}</text>
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
      svg: `<text x="${x + 12}" y="${y + 24}" fill="${color}" font-size="16" font-weight="${fontWeight}" font-family="Segoe UI, Arial, sans-serif">${lines
        .map(
          (line, index) =>
            `<tspan x="${x + 12}" dy="${index === 0 ? 0 : 20}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`,
    }
  }

  const titleText = titleLines.length
    ? `<text x="${paddingX}" y="48" fill="#142b4d" font-size="30" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${titleLines
        .map(
          (line, index) =>
            `<tspan x="${paddingX}" dy="${index === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`
    : ''

  const subtitleStartY = 48 + Math.max(0, (titleLines.length - 1) * 34) + (titleLines.length ? 24 : 0)
  const subtitleText = subtitleLines.length
    ? `<text x="${paddingX}" y="${subtitleStartY}" fill="#5e7190" font-size="18" font-weight="400" font-family="Segoe UI, Arial, sans-serif">${subtitleLines
        .map(
          (line, index) =>
            `<tspan x="${paddingX}" dy="${index === 0 ? 0 : 24}">${escapeXml(line)}</tspan>`,
        )
        .join('')}</text>`
    : ''

  const headerCells = normalizedHeaders.map((header, columnIndex) =>
    renderCell(header, paddingX + columnWidths.slice(0, columnIndex).reduce((sum, value) => sum + value, 0), currentY, columnWidths[columnIndex], '#1e3f6d', 700),
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
