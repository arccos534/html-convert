import type { TableData } from '../types'

export const resizeTableColumn = (data: TableData, index: number, remove = false): TableData => {
  const width = Math.max(1, data.headers.length, ...data.rows.map(row => row.length))
  const headers = Array.from({ length: width }, (_, i) => data.headers[i] ?? '')
  const rows = data.rows.map(row => Array.from({ length: width }, (_, i) => row[i] ?? ''))
  const headersHtml = Array.from({ length: width }, (_, i) => data.headersHtml?.[i] ?? '')
  const rowsHtml = rows.map((row, r) => row.map((_, c) => data.rowsHtml?.[r]?.[c] ?? ''))
  if (remove) {
    if (width <= 1) return data
    headers.splice(index, 1)
    headersHtml.splice(index, 1)
    rows.forEach(row => row.splice(index, 1))
    rowsHtml.forEach(row => row.splice(index, 1))
  } else {
    headers.splice(index, 0, 'Столбец')
    headersHtml.splice(index, 0, '')
    rows.forEach(row => row.splice(index, 0, ''))
    rowsHtml.forEach(row => row.splice(index, 0, ''))
  }
  return { ...data, headers, rows, headersHtml, rowsHtml }
}

export const insertTableRow = (data: TableData, index: number): TableData => {
  const width = Math.max(1, data.headers.length, ...data.rows.map(row => row.length))
  const rows = [...data.rows]
  const rowsHtml = data.rows.map((row, r) => row.map((_, c) => data.rowsHtml?.[r]?.[c] ?? ''))
  rows.splice(index, 0, Array.from({ length: width }, () => ''))
  rowsHtml.splice(index, 0, Array.from({ length: width }, () => ''))
  return { ...data, rows, rowsHtml }
}

export const removeTableRow = (data: TableData, index: number): TableData => ({
  ...data,
  rows: data.rows.filter((_, i) => i !== index),
  rowsHtml: data.rows.filter((_, i) => i !== index).map((_, r) => data.rowsHtml?.[r < index ? r : r + 1] ?? []),
})
