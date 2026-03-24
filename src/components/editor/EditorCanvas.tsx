import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { ArticleBlock } from '../../types'
import { SortableBlockItem } from './SortableBlockItem'

interface EditorCanvasProps {
  blocks: ArticleBlock[]
  selectedBlockId: string | null
  editable: boolean
  onSelectBlock: (id: string) => void
  onChangeBlock: (block: ArticleBlock) => void
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
  onReorderBlocks: (blocks: ArticleBlock[]) => void
}

export const EditorCanvas = ({
  blocks,
  selectedBlockId,
  editable,
  onSelectBlock,
  onChangeBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onReorderBlocks,
}: EditorCanvasProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = blocks.findIndex((block) => block.id === active.id)
    const newIndex = blocks.findIndex((block) => block.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    onReorderBlocks(arrayMove(blocks, oldIndex, newIndex))
  }

  return (
    <div className="editor-canvas">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block) => (
            <SortableBlockItem
              key={block.id}
              block={block}
              selected={selectedBlockId === block.id}
              editable={editable}
              onSelect={() => onSelectBlock(block.id)}
              onDelete={() => onDeleteBlock(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onChange={onChangeBlock}
            />
          ))}
        </SortableContext>
      </DndContext>
      {blocks.length === 0 && (
        <div className="empty-state">
          <p>Страница пустая. Добавьте первый блок из левой панели.</p>
        </div>
      )}
    </div>
  )
}

