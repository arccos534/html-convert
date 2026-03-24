import type { BlockTemplate, BlockType } from '../../types'

interface BlockLibraryProps {
  templates: BlockTemplate[]
  onAddBlock: (type: BlockType) => void
}

export const BlockLibrary = ({ templates, onAddBlock }: BlockLibraryProps) => {
  const categoryLabels: Record<string, string> = {
    Templates: 'Шаблоны',
    Text: 'Текст',
    Highlights: 'Акценты',
    Layout: 'Компоновка',
    Media: 'Медиа',
    Data: 'Данные',
  }

  const grouped = templates.reduce<Record<string, BlockTemplate[]>>((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {})

  return (
    <aside className="panel panel-left">
      <div className="panel-header">
        <h2>Библиотека блоков</h2>
        <p>Добавляйте секции как в конструкторе Tilda</p>
      </div>

      <div className="library-groups">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="library-group">
            <h3>{categoryLabels[category] ?? category}</h3>
            <div className="library-grid">
              {items.map((item) => (
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

