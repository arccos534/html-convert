import type { StatsBlock } from '../../types'
import { FormattedTextField } from './FormattedTextField'

export const StatsBlockEditor = ({ block, editable, onChange }: {
  block: StatsBlock
  editable: boolean
  onChange: (block: StatsBlock) => void
}) => {
  const { data } = block
  const update = (items: StatsBlock['data']['items']) => onChange({ ...block, data: { ...data, items } })
  return <section className="content-block">
    <FormattedTextField tag="h3" value={data.title} html={data.titleHtml} ariaLabel="Заголовок статистики" readOnly={!editable}
      onChange={(title, titleHtml) => onChange({ ...block, data: { ...data, title, titleHtml } })} />
    <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${data.columns ?? 1}, minmax(0, 1fr))` }}>
      {data.items.map((item, index) => <article className="stat-card" key={index}>
        {editable && <div className="data-block-tools">
          <button type="button" className="settings-action-button" aria-label={`Переместить показатель ${index + 1} раньше`} disabled={index === 0} onClick={() => {
            const items = [...data.items]
            items[index] = items[index - 1]
            items[index - 1] = item
            update(items)
          }}>↑</button>
          <button type="button" className="settings-action-button" aria-label={`Переместить показатель ${index + 1} позже`} disabled={index === data.items.length - 1} onClick={() => {
            const items = [...data.items]
            items[index] = items[index + 1]
            items[index + 1] = item
            update(items)
          }}>↓</button>
          <button type="button" className="settings-action-button" aria-label={`Дублировать показатель ${index + 1}`} onClick={() => {
            const items = [...data.items]
            items.splice(index + 1, 0, { ...item })
            update(items)
          }}>Дублировать</button>
          <button type="button" className="settings-action-button" aria-label={`Удалить показатель ${index + 1}`} onClick={() => update(data.items.filter((_, i) => i !== index))}>Удалить</button>
        </div>}
        {(['value', 'label', 'description'] as const).map((field) => <div className={`stat-${field}`} key={field}>
          <FormattedTextField tag="p" value={item[field]} html={item[`${field}Html`]} ariaLabel={`${{ value: 'Значение', label: 'Подпись', description: 'Описание' }[field]} показателя ${index + 1}`} readOnly={!editable}
            onChange={(text, html) => update(data.items.map((entry, i) => i === index ? { ...entry, [field]: text, [`${field}Html`]: html } : entry))} />
        </div>)}
      </article>)}
    </div>
    {editable && <button type="button" className="settings-action-button" onClick={() => update([...data.items, { value: '0', label: 'Показатель', description: '' }])}>Добавить показатель</button>}
  </section>
}
