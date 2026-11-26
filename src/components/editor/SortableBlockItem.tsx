import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { blockNames } from '../../data/blockFactory'
import type { ArticleBlock } from '../../types'
import { BlockRenderer } from '../blocks/BlockRenderer'

interface SortableBlockItemProps {
  block: ArticleBlock
  position: number
  selected: boolean
  editable: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onChange: (block: ArticleBlock) => void
  onImportChart: (blockId: string, file: File) => Promise<void>
}

export const SortableBlockItem = ({
  block,
  position,
  selected,
  editable,
  onSelect,
  onDelete,
  onDuplicate,
  onChange,
  onImportChart,
}: SortableBlockItemProps) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      id={`block-${block.id}`}
      data-block-type={block.type}
      style={style}
      className={`canvas-item${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
      onClick={onSelect}
      onFocusCapture={onSelect}
    >
      {editable && (
        <header className="canvas-item-header">
          <span className="block-position" aria-hidden="true">{String(position).padStart(2, '0')}</span>
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="drag-handle"
            {...attributes}
            {...listeners}
            aria-label={`Переместить блок «${blockNames[block.type]}»`}
            title="Переместить блок"
          >
            <span aria-hidden="true">⠿</span>
          </button>
          <strong>{blockNames[block.type]}</strong>
          <div className="canvas-item-actions">
            <button type="button" className="icon-button" aria-label="Дублировать блок" title="Дублировать блок" onClick={(event) => {
              event.stopPropagation()
              onDuplicate()
            }}>
              <span className="ui-icon icon-copy" aria-hidden="true" />
            </button>
            <button type="button" className="icon-button delete-block" aria-label="Удалить блок" title="Удалить блок" onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}>
              <span className="ui-icon icon-delete" aria-hidden="true" />
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
        onImportChart={onImportChart}
      />
    </article>
  )
}

