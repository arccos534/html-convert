import { useEffect, useMemo, useState } from 'react'
import Color from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { FontSize } from '../../extensions/fontSize'

interface RichTextEditorProps {
  value: string
  readOnly?: boolean
  showToolbar?: boolean
  requireSelectionForToolbarActions?: boolean
  align: 'left' | 'center' | 'right'
  paragraphGap: number
  onChange: (html: string) => void
  onAlignChange?: (align: 'left' | 'center' | 'right') => void
}

const fontSizes = [14, 16, 18, 20, 24, 28, 32]

const ToolbarButton = ({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) => (
  <button
    type="button"
    className={`rt-btn ${active ? 'is-active' : ''}`}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </button>
)

export const RichTextEditor = ({
  value,
  onChange,
  readOnly,
  showToolbar = true,
  requireSelectionForToolbarActions = false,
  align,
  paragraphGap,
  onAlignChange,
}: RichTextEditorProps) => {
  const [lastSelection, setLastSelection] = useState<{ from: number; to: number } | null>(null)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    [],
  )

  const editor = useEditor({
    extensions,
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'rt-editor',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onSelectionUpdate: ({ editor }) => {
      const selection = editor.state.selection
      setLastSelection(selection.empty ? null : { from: selection.from, to: selection.to })
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.commands.setTextAlign(align)
    const selection = editor.state.selection
    setLastSelection(selection.empty ? null : { from: selection.from, to: selection.to })
  }, [align, editor])

  if (!editor) {
    return null
  }

  const getActiveSelection = () => {
    const selection = editor.state.selection
    if (!selection.empty) {
      return { from: selection.from, to: selection.to }
    }
    return lastSelection
  }

  const runToolbarCommand = (command: (chain: any) => void) => {
    if (readOnly) {
      return
    }

    const selection = getActiveSelection()
    if (requireSelectionForToolbarActions && !selection) {
      return
    }

    const chain = editor.chain().focus()
    if (selection) {
      chain.setTextSelection(selection)
    }

    command(chain)
    chain.run()
  }

  const applyLink = () => {
    const selection = getActiveSelection()
    if (requireSelectionForToolbarActions && !selection) {
      return
    }

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Введите URL ссылки', previousUrl || 'https://')

    if (url === null) {
      return
    }

    runToolbarCommand((chain) => {
      if (url === '') {
        chain.unsetLink()
        return
      }

      chain.setLink({ href: url })
    })
  }

  const disableToolbar = Boolean(readOnly)
  const selectionActionDisabled =
    disableToolbar || (requireSelectionForToolbarActions && !getActiveSelection())
  const currentAlign = editor.isActive({ textAlign: 'center' })
    ? 'center'
    : editor.isActive({ textAlign: 'right' })
      ? 'right'
      : 'left'

  return (
    <div className="rt-wrapper" style={{ ['--paragraph-gap' as string]: `${paragraphGap}px` }}>
      {!readOnly && showToolbar && (
        <div className="rt-toolbar">
          <ToolbarButton
            label="P"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.setParagraph())}
            active={editor.isActive('paragraph')}
          />
          <ToolbarButton
            label="H1"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleHeading({ level: 1 }))}
            active={editor.isActive('heading', { level: 1 })}
          />
          <ToolbarButton
            label="H2"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleHeading({ level: 2 }))}
            active={editor.isActive('heading', { level: 2 })}
          />
          <ToolbarButton
            label="H3"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleHeading({ level: 3 }))}
            active={editor.isActive('heading', { level: 3 })}
          />
          <ToolbarButton
            label="B"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleBold())}
            active={editor.isActive('bold')}
          />
          <ToolbarButton
            label="I"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleItalic())}
            active={editor.isActive('italic')}
          />
          <ToolbarButton
            label="U"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleUnderline())}
            active={editor.isActive('underline')}
          />
          <ToolbarButton
            label="•"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleBulletList())}
            active={editor.isActive('bulletList')}
          />
          <ToolbarButton
            label="1."
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleOrderedList())}
            active={editor.isActive('orderedList')}
          />
          <ToolbarButton
            label="?"
            disabled={selectionActionDisabled}
            onClick={() => runToolbarCommand((chain) => chain.toggleBlockquote())}
            active={editor.isActive('blockquote')}
          />
          <ToolbarButton
            label="Link"
            disabled={selectionActionDisabled}
            onClick={applyLink}
            active={editor.isActive('link')}
          />

          <label className="rt-inline-field">
            A
            <input
              type="color"
              disabled={selectionActionDisabled}
              value={editor.getAttributes('textStyle').color || '#172033'}
              onChange={(event) =>
                runToolbarCommand((chain) => chain.setColor(event.target.value))
              }
            />
          </label>

          <label className="rt-inline-field">
            Размер
            <select
              disabled={selectionActionDisabled}
              value={String(editor.getAttributes('textStyle').fontSize || '16px').replace('px', '')}
              onChange={(event) =>
                runToolbarCommand((chain) => chain.setFontSize(`${event.target.value}px`))
              }
            >
              {fontSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <label className="rt-inline-field">
            Выравн.
            <select
              disabled={selectionActionDisabled}
              value={currentAlign}
              onChange={(event) => {
                const nextAlign = event.target.value as 'left' | 'center' | 'right'
                runToolbarCommand((chain) => chain.setTextAlign(nextAlign))
                onAlignChange?.(nextAlign)
              }}
            >
              <option value="left">Слева</option>
              <option value="center">Центр</option>
              <option value="right">Справа</option>
            </select>
          </label>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
