import { useState } from 'react'
import { blockNames, blockTemplates } from '../../data/blockFactory'
import type { ArticleBlock, BlockType } from '../../types'

const groups: { name: string; types: BlockType[] }[] = [
  { name: 'Основные', types: ['hero', 'newsIntro', 'richText', 'image', 'quote'] },
  { name: 'Композиция', types: ['columns', 'cards', 'background', 'divider', 'button'] },
  { name: 'Акценты', types: ['important', 'callout'] },
  { name: 'Данные', types: ['table', 'stats', 'chart'] },
]

interface BlockLibraryProps {
  blocks: ArticleBlock[]
  selectedBlockId: string | null
  showOutline: boolean
  onChangeSection: (outline: boolean) => void
  onAddBlock: (type: BlockType) => void
  onJumpToBlock: (id: string) => void
}

export const BlockLibrary = ({ blocks, selectedBlockId, showOutline, onChangeSection, onAddBlock, onJumpToBlock }: BlockLibraryProps) => {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е')
  const visibleTemplates = blockTemplates.filter((item) =>
    `${item.name} ${item.description}`.toLocaleLowerCase('ru').replaceAll('ё', 'е').includes(normalizedQuery),
  )

  return (
    <aside className="panel panel-left" aria-label="Библиотека и структура статьи">
      <div className="panel-header">
        <h2>Библиотека</h2>
        <div className="segmented panel-switch" role="group" aria-label="Библиотека и структура">
          <button type="button" aria-pressed={!showOutline} onClick={() => onChangeSection(false)}>Блоки</button>
          <button type="button" aria-pressed={showOutline} onClick={() => onChangeSection(true)}>Структура</button>
        </div>
      </div>

      {showOutline ? (
        blocks.length > 0 ? (
          <ol className="library-outline">
            {blocks.map((block, index) => (
              <li key={block.id}>
                <button type="button" className="library-card outline-card" aria-current={selectedBlockId === block.id ? 'true' : undefined} onClick={() => onJumpToBlock(block.id)}>
                  <span className="outline-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{blockNames[block.type]}</strong>
                </button>
              </li>
            ))}
          </ol>
        ) : <p className="library-empty">В статье пока нет блоков.</p>
      ) : (
        <>
          <label className="library-search">
            <span className="ui-icon icon-search" aria-hidden="true" />
            <input type="search" placeholder="Найти блок" aria-label="Найти блок" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {visibleTemplates.length === 0 ? <p className="library-empty" role="status">Блоки не найдены.</p> : (
            <div className="library-groups">
              {groups.map(({ name, types }) => {
                const items = types.flatMap((type) => visibleTemplates.filter((item) => item.type === type))
                if (items.length === 0) return null

                return (
                  <section key={name} className="library-group">
                    <h3>{name}</h3>
                    <div className="library-grid">
                      {items.map((item) => (
                        <button key={item.type} type="button" className="library-card" title={item.description} onClick={() => onAddBlock(item.type)}>
                          <strong>{item.name}</strong>
                          <span className="library-add" aria-hidden="true">+</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
