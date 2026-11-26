import type { WorkBook } from 'xlsx'
import type { ChartData, ChartItem, ChartSeries } from '../types'
import { getChartScaleDivisions } from './chartScale'
import { readImageAsDataUrl } from './documentIO'
import { sanitizeHtml } from './sanitizeHtml'

const chartPalette = ['#1f8efa', '#38bdf8', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5a4', '#8b5cf6']

const normalizeImportedChartValue = (value: string) => {
  const normalized = value
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/%$/, '')

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const isChartColor = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)

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

const chartLabelText = (plain: string, html: string | undefined, maxChars: number, x: number, lineHeight: number) => {
  const source = html?.trim() ? new DOMParser().parseFromString(sanitizeHtml(html), 'text/html').body : null
  const segments: Array<{ text: string; bold: boolean; italic: boolean; underline: boolean; color?: string; fontSize?: string; fontFamily?: string }> = []
  const visit = (node: Node, inherited = { bold: false, italic: false, underline: false, color: undefined as string | undefined, fontSize: undefined as string | undefined, fontFamily: undefined as string | undefined }) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) segments.push({ ...inherited, text: node.textContent })
      return
    }
    if (!(node instanceof HTMLElement)) return
    const style = node.getAttribute('style') || ''
    const next = {
      bold: inherited.bold || node.tagName === 'B' || node.tagName === 'STRONG' || /font-weight\s*:\s*(bold|[6-9]00)/i.test(style),
      italic: inherited.italic || node.tagName === 'I' || node.tagName === 'EM' || /font-style\s*:\s*italic/i.test(style),
      underline: inherited.underline || node.tagName === 'U' || /text-decoration[^;]*underline/i.test(style),
      color: style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]?.trim() || inherited.color,
      fontSize: style.match(/(?:^|;)\s*font-size\s*:\s*([\d.]+px)/i)?.[1] || inherited.fontSize,
      fontFamily: style.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1]?.trim() || inherited.fontFamily,
    }
    node.childNodes.forEach((child) => visit(child, next))
  }
  if (source) source.childNodes.forEach((node) => visit(node))
  const richText = segments.map((segment) => segment.text).join('').replace(/\s+/g, ' ').trim()
  if (!segments.length || richText !== plain.replace(/\s+/g, ' ').trim()) {
    segments.splice(0, segments.length, { text: plain, bold: false, italic: false, underline: false })
  }
  const expanded = segments.flatMap((segment) => Array.from(segment.text.replace(/\s+/g, ' '), (char) => ({ ...segment, text: char })))
  const lines = wrapText(plain, maxChars)
  let offset = 0
  return lines.map((line, lineIndex) => {
    while (expanded[offset]?.text === ' ' && lineIndex > 0) offset += 1
    const chars = expanded.slice(offset, offset + line.length)
    offset += line.length
    const chunks: Array<{ text: string; style: typeof expanded[number] }> = []
    chars.forEach((char) => {
      const prior = chunks[chunks.length - 1]
      if (prior && prior.style.bold === char.bold && prior.style.italic === char.italic && prior.style.underline === char.underline && prior.style.color === char.color && prior.style.fontSize === char.fontSize && prior.style.fontFamily === char.fontFamily) prior.text += char.text
      else chunks.push({ text: char.text, style: char })
    })
    const styled = chunks.map(({ text, style }) => {
      const attrs = [
        style.bold ? 'font-weight="700"' : '',
        style.italic ? 'font-style="italic"' : '',
        style.underline ? 'text-decoration="underline"' : '',
        style.color && (/^#[0-9a-f]{3,8}$/i.test(style.color) || /^rgba?\([\d.,%\s]+\)$/i.test(style.color)) ? `fill="${escapeXml(style.color)}"` : '',
        style.fontSize ? `font-size="${escapeXml(style.fontSize)}"` : '',
        style.fontFamily && /^[\w\s,'"-]+$/.test(style.fontFamily) ? `font-family="${escapeXml(style.fontFamily)}"` : '',
      ].filter(Boolean).join(' ')
      return `<tspan ${attrs}>${escapeXml(text)}</tspan>`
    }).join('')
    return `<tspan x="${x}" dy="${lineIndex === 0 ? 0 : lineHeight}">${styled}</tspan>`
  }).join('')
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

const findFirstNonEmptySheetRows = (workbook: WorkBook, utils: typeof import('xlsx').utils) => {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rawRows = utils.sheet_to_json<unknown[]>(sheet, {
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

const buildSingleSeriesChartItems = (rows: string[][], hasColorColumn: boolean) => {
  const items: ChartItem[] = []
  for (const [label, valueText, color] of rows) {
    const value = normalizeImportedChartValue(valueText)
    if (!label || value === null || value < 0) {
      return null
    }

    items.push({
      label,
      value,
      color: hasColorColumn && isChartColor(color) ? color : chartPalette[items.length % chartPalette.length],
    })
  }
  return items.length ? items : null
}

const buildMultiSeriesChart = (body: string[][], headers?: string[]): ChartSeries[] | null => {
  if (!body.length || body[0].length < 3 || body.some((row) => !row[0])) {
    return null
  }

  const series: ChartSeries[] = []
  for (let column = 1; column < body[0].length; column += 1) {
    const cells = body.map((row) => row[column])
    const values = cells.map(normalizeImportedChartValue)
    if (values.every((value) => value === null) || values.some((value, index) =>
      value === null ? Boolean(cells[index]) : value < 0,
    )) {
      return null
    }
    series.push({
      name: headers?.[column] || `Серия ${column}`,
      color: chartPalette[(column - 1) % chartPalette.length],
      values,
    })
  }
  return series
}

type SpreadsheetImportResult =
  | { kind: 'chart'; items: ChartItem[]; max: number; series?: ChartSeries[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }

const importSpreadsheetFile = async (file: File): Promise<SpreadsheetImportResult | null> => {
  const XLSX = await import('xlsx')
  const bytes = await file.arrayBuffer()
  let workbook: WorkBook

  if (/\.csv$/i.test(file.name)) {
    const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2))
    let csv: string
    try {
      const encoding = signature[0] === 0xff && signature[1] === 0xfe ? 'utf-16le'
        : signature[0] === 0xfe && signature[1] === 0xff ? 'utf-16be'
          : 'utf-8'
      csv = new TextDecoder(encoding, { fatal: true }).decode(bytes)
    } catch {
      csv = new TextDecoder('windows-1251').decode(bytes)
    }
    workbook = XLSX.read(csv, { type: 'string', raw: true })
  } else {
    workbook = XLSX.read(bytes, { type: 'array' })
    const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 4))
    const isLegacyExcel = signature[0] === 0xd0 && signature[1] === 0xcf && signature[2] === 0x11 && signature[3] === 0xe0
      || [0x09, 0x0809, 0x0409, 0x0209].includes(signature[0] + signature[1] * 256)
    if (!isLegacyExcel && !/^(xlsx|xlsm|xlsb|xls|biff[258]|xlml)$/.test(workbook.bookType ?? '')) {
      return null
    }
  }

  const sheetData = findFirstNonEmptySheetRows(workbook, XLSX.utils)
  if (!sheetData) {
    return null
  }

  const [firstRow, ...body] = sheetData.rows
  const seriesHeaders = firstRow.slice(1)
  const hasLabelHeader = /^(муниципалитет|район|город|округ|категория|период|показатель|дата|месяц|год|название|label|category|period|date|month|year)$/i.test(firstRow[0])
  const hasYearHeaders = seriesHeaders.length > 1 && seriesHeaders.every((cell) => /^(19|20)\d{2}$/.test(cell))
  const hasTextHeaders = seriesHeaders.some(Boolean) &&
    seriesHeaders.every((cell) => normalizeImportedChartValue(cell) === null)
  const hasHeader = body.length > 0 && (
    hasLabelHeader || hasYearHeaders || hasTextHeaders
  )
  const chartRows = hasHeader ? body : sheetData.rows
  const hasColorColumn = firstRow.length === 3 && (
    (/^(цвет|color)$/i.test(firstRow[2]) || chartRows.some((row) => isChartColor(row[2]))) &&
    chartRows.every((row) => !row[2] || isChartColor(row[2]))
  )
  const singleSeriesItems = firstRow.length === 2 || hasColorColumn
    ? buildSingleSeriesChartItems(chartRows, hasColorColumn)
    : null

  if (singleSeriesItems) {
    return {
      kind: 'chart',
      items: singleSeriesItems,
      max: Math.max(1, ...singleSeriesItems.map((item) => item.value)),
    }
  }

  const series = buildMultiSeriesChart(chartRows, hasHeader ? firstRow : undefined)
  if (series) {
    const items = chartRows.map(([label], index) => ({
      label,
      value: Math.max(0, ...series.map((item) => item.values[index] ?? 0)),
      color: series[0].color,
    }))
    return {
      kind: 'chart',
      items,
      max: Math.max(1, ...items.map((item) => item.value)),
      series,
    }
  }

  return { kind: 'table', headers: firstRow, rows: body }
}

export const chartFileAccept = '.xlsx,.xls,.csv,.svg,.png,.jpg,.jpeg,.webp'

export const importChartFile = async (file: File): Promise<Partial<ChartData>> => {
  const imageAlt = file.name.replace(/\.[^.]+$/, '') || 'Диаграмма'
  const source = { imageAlt, tableHeaders: [], tableRows: [], spreadsheetChart: undefined }
  if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
    const imported = await importSpreadsheetFile(file)
    if (!imported) {
      throw new Error('Не удалось распознать данные файла.')
    }

    if (imported.kind === 'chart') {
      return {
        ...source,
        importSource: 'excel',
        imageSrc: '',
        spreadsheetChart: { series: imported.series },
        items: imported.items,
        max: imported.max,
      }
    }

    return {
      ...source,
      importSource: 'excel',
      imageSrc: renderTableToSvgDataUrl(imported.headers, imported.rows),
      tableHeaders: imported.headers,
      tableRows: imported.rows,
    }
  }

  if (/\.(svg|png|jpe?g|webp)$/i.test(file.name)) {
    const imageSrc = await readImageAsDataUrl(file)
    const image = new Image()
    image.src = imageSrc
    await image.decode()
    return { ...source, importSource: 'image', imageSrc }
  }

  throw new Error('Поддерживаются Excel, CSV и изображения.')
}

export const getChartImageSrc = (data: ChartData) => {
  if (!data.spreadsheetChart && data.imageSrc) {
    return data.imageSrc
  }

  const divisions = data.showGrid === false ? 0 : getChartScaleDivisions(data.scaleDivisions)
  const max = Math.max(1, data.max, ...data.items.map((item) => item.value))
  const { series } = data.spreadsheetChart || {}
  return series
    ? renderMultiSeriesChartToSvgDataUrl(data.items, series, max, divisions, data)
    : renderChartItemsToSvgDataUrl(data.items, { max, divisions, showValues: data.showValues ?? true, radius: data.barRadius ?? 3, barHeight: data.barHeight ?? 18 })
}

const formatTick = (value: number) => value.toLocaleString('ru-RU', { maximumSignificantDigits: 5 })

const renderChartItemsToSvgDataUrl = (
  items: ChartItem[],
  { max, divisions, showValues, radius, barHeight }: { max: number; divisions: number; showValues: boolean; radius: number; barHeight: number },
) => {
  const width = 580
  const paddingX = 22
  const cardRadius = 16
  const gap = 10
  const labelWidth = 116
  const valueWidth = 64
  const labels = items.map((item) => wrapText(item.label, 13))
  const rowHeight = Math.max(barHeight + 18, 46, ...labels.map((label) => label.length * 16 + 12))
  const chartTop = 20
  const axisBottom = chartTop + items.length * rowHeight
  const height = axisBottom + 34
  const innerWidth = width - paddingX * 2
  const barWidth = innerWidth - labelWidth - valueWidth - gap * 2
  const barX = paddingX + labelWidth + gap
  const gridSvg = divisions ? Array.from({ length: divisions + 1 }, (_, index) => {
    const x = barX + barWidth * index / divisions
    const value = formatTick(max * (index / divisions))
    const showLabel = divisions <= 5 || index === 0 || index === divisions || index * 2 === divisions
    return `
      <line x1="${x}" y1="${chartTop}" x2="${x}" y2="${axisBottom}" stroke="#bdcde3" />
      ${showLabel ? `<text x="${x}" y="${axisBottom + 20}" fill="#46607f" font-size="16" text-anchor="middle" font-family="Open Sans, Arial, sans-serif">${value}</text>` : ''}
    `
  }).join('') : ''

  const rowsSvg = items
    .map((item, index) => {
      const centerY = chartTop + (index + 0.5) * rowHeight
      const filledWidth = barWidth * (item.value / max)
      const label = labels[index]

      return `
        <text x="${paddingX}" y="${centerY + 5 - (label.length - 1) * 8}" fill="#46607f" font-size="16" font-weight="500" font-family="Open Sans, Arial, sans-serif">${chartLabelText(item.label, item.labelHtml, 13, paddingX, 16)}</text>
        <rect x="${barX}" y="${centerY - barHeight / 2}" width="${barWidth}" height="${barHeight}" rx="${radius}" fill="#e7eef9" />
        <rect x="${barX}" y="${centerY - barHeight / 2}" width="${filledWidth}" height="${barHeight}" rx="${radius}" fill="${escapeXml(item.color)}" />
        ${showValues ? `<text x="${barX + barWidth + gap}" y="${centerY + 5}" fill="#46607f" font-size="16" font-weight="500" font-family="Open Sans, Arial, sans-serif">${chartLabelText(item.value.toLocaleString('ru-RU', { maximumSignificantDigits: 17 }), item.valueHtml, 16, barX + barWidth + gap, 18)}</text>` : ''}
      `
    })
    .join('')

  return toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <rect width="${width}" height="${height}" rx="${cardRadius}" fill="#ffffff"/>
      ${gridSvg}
      ${rowsSvg}
    </svg>
  `)
}

const renderMultiSeriesChartToSvgDataUrl = (
  categories: ChartItem[],
  series: ChartSeries[],
  maxValue: number,
  divisions: number,
  data: ChartData,
) => {
  const paddingLeft = 58
  const paddingRight = 20
  const paddingTop = 22
  const chartHeight = 240
  const groupGap = 16
  const minGroupWidth = Math.max(72, series.length * 18)
  const gapsWidth = groupGap * Math.max(0, categories.length - 1)
  const minChartWidth = paddingLeft + paddingRight + categories.length * minGroupWidth + gapsWidth
  const legendItemWidths = series.map((item) => Math.max(85, item.name.length * 9 + 36))
  const minLegendWidth = paddingLeft + paddingRight + legendItemWidths.reduce((sum, item) => sum + item, 0)
  const width = Math.max(580, minChartWidth, minLegendWidth)
  const innerWidth = width - paddingLeft - paddingRight
  const groupWidth = (innerWidth - gapsWidth) / Math.max(categories.length, 1)
  const barGap = 6
  const availableBarWidth = (groupWidth - barGap * Math.max(0, series.length - 1)) / Math.max(series.length, 1)
  const barWidth = Math.min(availableBarWidth, data.barHeight ?? 18)
  const axisBottom = paddingTop + chartHeight
  const categoryLabels = categories.map((item) => wrapText(item.label, Math.floor(groupWidth / 8)))
  const legendY = axisBottom + Math.max(1, ...categoryLabels.map((lines) => lines.length)) * 18 + 24
  const gridSvg = divisions ? Array.from({ length: divisions + 1 }, (_, index) => {
    const y = paddingTop + (chartHeight / divisions) * index
    const value = formatTick(maxValue * ((divisions - index) / divisions))
    return `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#d3dfef" stroke-width="1" />
      <text x="${paddingLeft - 8}" y="${y + 5}" fill="#46607f" font-size="16" text-anchor="end" font-family="Open Sans, Arial, sans-serif">${value}</text>
    `
  }).join('') : ''

  const barsSvg = categories
    .map((item, categoryIndex) => {
      const groupX = paddingLeft + categoryIndex * (groupWidth + groupGap)
      const centerX = groupX + groupWidth / 2
      const categoryBars = series
        .map((seriesItem, seriesIndex) => {
          const value = seriesItem.values[categoryIndex]
          if (value == null) {
            return ''
          }
          const height = (value / maxValue) * chartHeight
          const groupBarsWidth = series.length * barWidth + (series.length - 1) * barGap
          const x = groupX + (groupWidth - groupBarsWidth) / 2 + seriesIndex * (barWidth + barGap)
          const y = axisBottom - height

          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="${data.barRadius ?? 3}" fill="${escapeXml(seriesItem.color)}" />
            ${data.showValues === false ? '' : `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" fill="#46607f" font-size="13">${chartLabelText(value.toLocaleString('ru-RU'), seriesItem.valuesHtml?.[categoryIndex], 10, x + barWidth / 2, 13)}</text>`}
          `
        })
        .join('')

      return `
        ${categoryBars}
        <text x="${centerX}" y="${axisBottom + 20}" fill="#46607f" font-size="16" text-anchor="middle" font-family="Open Sans, Arial, sans-serif">${chartLabelText(item.label, item.labelHtml, Math.floor(groupWidth / 8), centerX, 18)}</text>
      `
    })
    .join('')

  let legendX = paddingLeft
  const legendSvg = series
    .map((seriesItem, index) => {
      const x = legendX
      legendX += legendItemWidths[index]
      return `
        <circle cx="${x}" cy="${legendY}" r="6" fill="${escapeXml(seriesItem.color)}" />
        <text x="${x + 12}" y="${legendY + 5}" fill="#2e4669" font-size="16" font-family="Open Sans, Arial, sans-serif">${chartLabelText(seriesItem.name, seriesItem.nameHtml, Math.max(1, Math.floor((legendItemWidths[index] - 36) / 9)), x + 12, 18)}</text>
      `
    })
    .join('')

  const height = legendY + 22

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
