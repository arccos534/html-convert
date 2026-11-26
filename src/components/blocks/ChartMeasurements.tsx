import type { ChartData } from '../../types'
import { chartScaleDivisions, getChartScaleDivisions } from '../../lib/chartScale'
import { FormattedTextField } from './FormattedTextField'

export const ChartMeasurements = ({ data, onChange }: { data: ChartData; onChange: (data: ChartData) => void }) => {
  const series = data.spreadsheetChart?.series
  const max = Math.max(1, data.max, ...data.items.map(item => item.value))
  const updateItem = (index: number, patch: Partial<ChartData['items'][number]>) =>
    onChange({ ...data, items: data.items.map((item, position) => position === index ? { ...item, ...patch } : item) })
  const remove = (index: number) => onChange({
    ...data,
    items: data.items.filter((_, position) => position !== index),
    spreadsheetChart: series ? { series: series.map(entry => ({
      ...entry, values: entry.values.filter((_, position) => position !== index),
      valuesHtml: entry.valuesHtml?.filter((_, position) => position !== index),
    })) } : data.spreadsheetChart,
  })
  return <div className="chart-measurements">
    <div className="chart-card-settings">
      <label>Форма полос<select value={data.barRadius ?? 3} onChange={event => onChange({ ...data, barRadius: Number(event.target.value) })}>
        <option value={0}>Прямоугольные</option><option value={3}>Слегка скруглённые</option><option value={9}>Скруглённые</option>
      </select></label>
      <label>Толщина<input type="range" min={8} max={40} value={data.barHeight ?? 18} onChange={event => onChange({ ...data, barHeight: Number(event.target.value) })} /></label>
      <label>Деления шкалы<select value={getChartScaleDivisions(data.scaleDivisions)} onChange={event => onChange({ ...data, scaleDivisions: Number(event.target.value), showGrid: true })}>
        {chartScaleDivisions.map(count => <option key={count}>{count}</option>)}
      </select></label>
      <label>Максимум шкалы<input type="number" min={1} value={data.max} onChange={event => onChange({ ...data, max: Math.max(1, Number(event.target.value) || 1) })} /></label>
    </div>
    {series?.map((entry, index) => <div key={index} className="chart-series-name"><span>Название ряда</span>
      <FormattedTextField value={entry.name} html={entry.nameHtml} ariaLabel={`Название ряда ${index + 1}`} readOnly={false}
        onChange={(name, nameHtml) => onChange({ ...data, spreadsheetChart: { series: series.map((item, position) =>
          position === index ? { ...item, name, nameHtml } : item) } })} />
    </div>)}
    {data.items.map((item, index) => <div className="chart-measurement" key={index}>
      <div className="chart-measurement-name">
        <FormattedTextField value={item.label} html={item.labelHtml} ariaLabel={`Название измерения ${index + 1}`} readOnly={false}
          onChange={(label, labelHtml) => updateItem(index, { label, labelHtml })} />
        <button type="button" aria-label={`Удалить измерение ${item.label}`} onClick={() => remove(index)}>×</button>
      </div>
      {(series || [{ name: item.label, color: item.color, values: data.items.map(entry => entry.value) }]).map((entry, seriesIndex) => {
        const value = entry.values[index]
        const update = (patch: { color?: string; value?: number | null; valueHtml?: string }) => {
          if (!series) {
            updateItem(index, { color: patch.color ?? item.color, value: patch.value ?? item.value, valueHtml: patch.valueHtml ?? item.valueHtml })
            return
          }
          const nextSeries = series.map((row, position) => position === seriesIndex ? {
            ...row, color: patch.color ?? row.color,
            values: patch.value !== undefined ? row.values.map((number, position) => position === index ? patch.value! : number) : row.values,
            valuesHtml: patch.valueHtml !== undefined ? Array.from({ length: row.values.length }, (_, valueIndex) => valueIndex === index ? patch.valueHtml : row.valuesHtml?.[valueIndex]) : row.valuesHtml,
          } : row)
          onChange({ ...data, spreadsheetChart: { series: nextSeries }, items: data.items.map((row, position) => ({
            ...row, value: Math.max(0, ...nextSeries.map(entry => entry.values[position] ?? 0)),
          })) })
        }
        return <div className="chart-measurement-bar-row" key={seriesIndex}>
          <div className="chart-measurement-track">
            <div className="chart-measurement-fill" style={{ width: `${Math.max(0, (value ?? 0) / max * 100)}%`, background: entry.color, height: data.barHeight ?? 18, borderRadius: data.barRadius ?? 3 }} />
            <input type="color" aria-label={`Цвет ${item.label}${series ? ` ${entry.name}` : ''}`} value={entry.color}
              title="Изменить цвет полосы" onChange={event => update({ color: event.target.value })} />
          </div>
          <div className="chart-measurement-value"><FormattedTextField value={value == null ? '' : String(value)} html={series ? entry.valuesHtml?.[index] : item.valueHtml}
            ariaLabel={`Значение ${item.label}${series ? ` ${entry.name}` : ''}`} readOnly={false}
            onChange={(text, valueHtml) => {
              const parsed = text.trim() === '' ? null : Number(text.trim().replace(',', '.'))
              if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return
              update({ value: parsed, valueHtml })
            }} /></div>
        </div>
      })}
    </div>)}
    <button type="button" className="settings-action-button" onClick={() => onChange({
      ...data, items: [...data.items, { label: 'Новое измерение', value: 0, color: '#1f8efa' }],
      spreadsheetChart: series ? { series: series.map(entry => ({ ...entry, values: [...entry.values, 0], valuesHtml: entry.valuesHtml ? [...entry.valuesHtml, undefined] : undefined })) } : data.spreadsheetChart,
    })}>Добавить измерение</button>
  </div>
}
