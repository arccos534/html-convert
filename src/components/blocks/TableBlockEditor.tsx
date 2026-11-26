import { useState } from 'react'
import type { TableBlock } from '../../types'
import { FormattedTextField } from './FormattedTextField'
import { insertTableRow, removeTableRow, resizeTableColumn } from '../../lib/tableEditing'

export const TableBlockEditor = ({ block, editable, onChange }: {
  block: TableBlock
  editable: boolean
  onChange: (block: TableBlock) => void
}) => {
  const [active, setActive] = useState({ row: 0, column: 0 })
  const { data } = block
  const width = Math.max(1, data.headers.length, ...data.rows.map(row => row.length))
  const column = Math.min(active.column, width - 1)
  const row = Math.min(active.row, Math.max(0, data.rows.length - 1))
  const update = (next: TableBlock['data']) => onChange({ ...block, data: next })
  return <section className="content-block">
    {editable && <div className="data-block-tools" aria-label="Структура таблицы">
      <button type="button" className="settings-action-button" onClick={() => update(insertTableRow(data, data.rows.length))}>Добавить строку</button>
      <button type="button" className="settings-action-button" onClick={() => update(resizeTableColumn(data, width))}>Добавить столбец</button>
      <button type="button" className="settings-action-button" onClick={() => update(insertTableRow(data, row))}>Строка выше</button>
      <button type="button" className="settings-action-button" onClick={() => update(resizeTableColumn(data, column))}>Столбец слева</button>
      <button type="button" className="settings-action-button" disabled={!data.rows.length} onClick={() => update(removeTableRow(data, row))}>Удалить строку {row + 1}</button>
      <button type="button" className="settings-action-button" disabled={width <= 1} onClick={() => update(resizeTableColumn(data, column, true))}>Удалить столбец {column + 1}</button>
    </div>}
    <FormattedTextField value={data.caption} html={data.captionHtml} tag="p" ariaLabel="Подпись таблицы" readOnly={!editable}
      onChange={(caption, captionHtml) => update({ ...data, caption, captionHtml })} />
    <div className="table-editor">
      <table><thead><tr>
        {Array.from({ length: width }, (_, index) => <th key={index} onFocusCapture={() => setActive({ ...active, column: index })}>
          <FormattedTextField value={data.headers[index] ?? ''} html={data.headersHtml?.[index]} tag="p" ariaLabel={`Заголовок столбца ${index + 1}`} readOnly={!editable}
            onChange={(value, html) => {
              const headers = Array.from({ length: width }, (_, i) => i === index ? value : data.headers[i] ?? '')
              const headersHtml = Array.from({ length: width }, (_, i) => i === index ? html : data.headersHtml?.[i] ?? '')
              update({ ...data, headers, headersHtml })
            }} />
        </th>)}
      </tr></thead><tbody>
        {data.rows.map((values, r) => <tr key={r}>
          {Array.from({ length: width }, (_, c) => <td key={c} onFocusCapture={() => setActive({ row: r, column: c })}>
            <FormattedTextField value={values[c] ?? ''} html={data.rowsHtml?.[r]?.[c]} tag="p" ariaLabel={`Строка ${r + 1}, столбец ${c + 1}`} readOnly={!editable}
              onChange={(value, html) => {
                const rows = data.rows.map((row, ri) => Array.from({ length: width }, (_, ci) => ri === r && ci === c ? value : row[ci] ?? ''))
                const rowsHtml = data.rows.map((_, ri) => Array.from({ length: width }, (_, ci) => ri === r && ci === c ? html : data.rowsHtml?.[ri]?.[ci] ?? ''))
                update({ ...data, rows, rowsHtml })
              }} />
          </td>)}
        </tr>)}
      </tbody></table>
    </div>
  </section>
}
