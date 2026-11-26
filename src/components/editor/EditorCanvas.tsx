import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
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
  onImportChart: (blockId: string, file: File) => Promise<void>
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
  onReorderBlocks: (blocks: ArticleBlock[]) => void
  onOpenLibrary: () => void
}

export const EditorCanvas = ({
  blocks,
  selectedBlockId,
  editable,
  onSelectBlock,
  onChangeBlock,
  onImportChart,
  onDeleteBlock,
  onDuplicateBlock,
  onReorderBlocks,
  onOpenLibrary,
}: EditorCanvasProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable: 'Нажмите пробел, чтобы взять блок. Перемещайте его стрелками, нажмите пробел для подтверждения или Escape для отмены.',
          },
          announcements: {
            onDragStart: () => 'Блок взят.',
            onDragOver: ({ over }) => over ? `Позиция ${blocks.findIndex((block) => block.id === over.id) + 1}.` : '',
            onDragEnd: () => 'Перемещение завершено.',
            onDragCancel: () => 'Перемещение отменено.',
          },
        }}
      >
        <SortableContext
          items={blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block, index) => (
            <SortableBlockItem
              key={block.id}
              block={block}
              position={index + 1}
              selected={selectedBlockId === block.id}
              editable={editable}
              onSelect={() => onSelectBlock(block.id)}
              onDelete={() => onDeleteBlock(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onChange={onChangeBlock}
              onImportChart={onImportChart}
            />
          ))}
        </SortableContext>
      </DndContext>
      {blocks.length > 0 ? (
        <div className="editor-tail">
          <button type="button" className="ui-button add-block-button" onClick={onOpenLibrary}>
            <span aria-hidden="true">+</span> Добавить блок
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <h2>В статье пока нет блоков</h2>
          <button type="button" className="ui-button primary add-block-button" onClick={onOpenLibrary}>
            <span aria-hidden="true">+</span> Добавить блок
          </button>
        </div>
      )}
    </div>
  )
}

