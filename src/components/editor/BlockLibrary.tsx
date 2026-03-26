import type { BlockTemplate, BlockType } from '../../types'

interface BlockLibraryProps {
  templates: BlockTemplate[]
  onAddBlock: (type: BlockType) => void
}

export const BlockLibrary = ({ templates, onAddBlock }: BlockLibraryProps) => {
  const categoryLabels: Record<string, string> = {
    Templates: 'Шаблоны',
    Text: 'Текст',
    Other: 'Другое',
    Media: 'Медиа',
    Data: 'Данные',
  }
  const categoryOrder = ['Templates', 'Text', 'Media', 'Other', 'Data']
  const normalizeCategory = (category: string) =>
    category === 'Highlights' || category === 'Layout' ? 'Other' : category

  const grouped = templates.reduce<Record<string, BlockTemplate[]>>((acc, template) => {
    const normalizedCategory = normalizeCategory(template.category)
    if (!acc[normalizedCategory]) {
      acc[normalizedCategory] = []
    }
    acc[normalizedCategory].push(template)
    return acc
  }, {})

  const orderedGroups = [
    ...categoryOrder.filter((category) => grouped[category]),
    ...Object.keys(grouped).filter((category) => !categoryOrder.includes(category)),
  ]

  return (
    <aside className="panel panel-left">
      <div className="panel-header">
        <h2>Библиотека блоков</h2>
        <p>Добавляйте секции как в конструкторе Tilda</p>
      </div>

      <div className="library-groups">
        {orderedGroups.map((category) => (
          <section key={category} className="library-group">
            <h3>{categoryLabels[category] ?? category}</h3>
            <div className="library-grid">
              {grouped[category].map((item) => (
                <button
                  key={`${category}-${item.type}`}
                  type="button"
                  className="library-card"
                  onClick={() => onAddBlock(item.type)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}

