import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { ArticleBlock } from '../../types'
import { BlockRenderer } from '../blocks/BlockRenderer'

interface SortableBlockItemProps {
  block: ArticleBlock
  selected: boolean
  editable: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onChange: (block: ArticleBlock) => void
}

const blockNames: Record<ArticleBlock['type'], string> = {
  hero: 'Заголовок',
  newsIntro: 'Новостной блок',
  richText: 'Текст',
  callout: 'Плашка',
  important: 'Важно',
  quote: 'Цитата',
  background: 'Блок с фоном',
  divider: 'Разделитель',
  button: 'Кнопка',
  table: 'Таблица',
  columns: 'Колонки',
  cards: 'Карточки',
  image: 'Изображение',
  stats: 'Статистика',
  chart: 'Диаграмма',
}

export const SortableBlockItem = ({
  block,
  selected,
  editable,
  onSelect,
  onDelete,
  onDuplicate,
  onChange,
}: SortableBlockItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`canvas-item ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
    >
      {editable && (
        <header className="canvas-item-header">
          <button
            type="button"
            className="drag-handle"
            aria-label="Переместить блок"
            {...attributes}
            {...listeners}
          >
            ?
          </button>
          <strong>{blockNames[block.type]}</strong>
          <div className="canvas-item-actions">
            <button type="button" onClick={onDuplicate}>
              Дублировать
            </button>
            <button type="button" onClick={onDelete}>
              Удалить
            </button>
          </div>
        </header>
      )}

      <BlockRenderer
        block={block}
        selected={selected}
        editable={editable}
        onSelect={onSelect}
        onChange={onChange}
      />
    </article>
  )
}

