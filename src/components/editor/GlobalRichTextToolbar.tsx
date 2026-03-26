import { useMemo } from 'react'
import { useRichTextToolbar } from '../blocks/RichTextToolbarContext'

const fontSizes = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]

const fontOptions = [
  {
    label: 'Default',
    value: "'Open Sans','Helvetica Neue',Helvetica,Arial,sans-serif",
  },
  {
    label: 'Arial',
    value: "Arial,'Helvetica Neue',Helvetica,sans-serif",
  },
  {
    label: 'Verdana',
    value: "Verdana,Geneva,sans-serif",
  },
  {
    label: 'Tahoma',
    value: "Tahoma,'Segoe UI',sans-serif",
  },
  {
    label: 'Trebuchet MS',
    value: "'Trebuchet MS',sans-serif",
  },
  {
    label: 'Georgia',
    value: "Georgia,'Times New Roman',serif",
  },
  {
    label: 'Times New Roman',
    value: "'Times New Roman',Times,serif",
  },
  {
    label: 'PT Astra Serif',
    value: "'PT Astra Serif',Georgia,serif",
  },
] as const

const normalizeFontFamily = (value?: string | null) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .trim()
    .toLowerCase()

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

export const GlobalRichTextToolbar = () => {
  const { activeBinding, lastSelection, version, refreshToolbar } = useRichTextToolbar()

  const editor = activeBinding?.editor ?? null
  const isInactive = !editor

  const currentFontFamily = useMemo(() => {
    if (!editor) {
      return fontOptions[0].value
    }

    const selectedFont = normalizeFontFamily(editor.getAttributes('textStyle').fontFamily)
    const matched = fontOptions.find((option) => normalizeFontFamily(option.value) === selectedFont)
    return matched?.value || fontOptions[0].value
  }, [editor, version])

  const selection = editor
    ? !editor.state.selection.empty
      ? { from: editor.state.selection.from, to: editor.state.selection.to }
      : lastSelection
    : null

  const selectionActionDisabled =
    isInactive || (Boolean(activeBinding?.requireSelectionForToolbarActions) && !selection)

  const runToolbarCommand = (command: (chain: any) => void) => {
    if (selectionActionDisabled || !editor) {
      return
    }

    const chain = editor.chain().focus()
    if (selection) {
      chain.setTextSelection(selection)
    }

    command(chain)
    chain.run()
    refreshToolbar()
  }

  const applyLink = () => {
    if (selectionActionDisabled || !editor) {
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

  const currentAlign = !editor
    ? 'left'
    : editor.isActive({ textAlign: 'center' })
      ? 'center'
      : editor.isActive({ textAlign: 'right' })
        ? 'right'
        : 'left'

  const isParagraph = editor?.isActive('paragraph') ?? false
  const isHeading1 = editor?.isActive('heading', { level: 1 }) ?? false
  const isHeading2 = editor?.isActive('heading', { level: 2 }) ?? false
  const isHeading3 = editor?.isActive('heading', { level: 3 }) ?? false
  const isBold = editor?.isActive('bold') ?? false
  const isItalic = editor?.isActive('italic') ?? false
  const isUnderline = editor?.isActive('underline') ?? false
  const isBulletList = editor?.isActive('bulletList') ?? false
  const isOrderedList = editor?.isActive('orderedList') ?? false
  const isBlockquote = editor?.isActive('blockquote') ?? false
  const isLink = editor?.isActive('link') ?? false

  return (
    <div className={`global-rt-toolbar ${isInactive ? 'is-disabled' : ''}`}>
      <div className="rt-toolbar">
        <ToolbarButton
          label="P"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.setParagraph())}
          active={isParagraph}
        />
        <ToolbarButton
          label="H1"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleHeading({ level: 1 }))}
          active={isHeading1}
        />
        <ToolbarButton
          label="H2"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleHeading({ level: 2 }))}
          active={isHeading2}
        />
        <ToolbarButton
          label="H3"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleHeading({ level: 3 }))}
          active={isHeading3}
        />
        <ToolbarButton
          label="B"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleBold())}
          active={isBold}
        />
        <ToolbarButton
          label="I"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleItalic())}
          active={isItalic}
        />
        <ToolbarButton
          label="U"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleUnderline())}
          active={isUnderline}
        />
        <ToolbarButton
          label="•"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleBulletList())}
          active={isBulletList}
        />
        <ToolbarButton
          label="1."
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleOrderedList())}
          active={isOrderedList}
        />
        <ToolbarButton
          label="❝"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleBlockquote())}
          active={isBlockquote}
        />
        <ToolbarButton
          label="Link"
          disabled={selectionActionDisabled}
          onClick={applyLink}
          active={isLink}
        />

        <label className="rt-inline-field">
          Шрифт
          <select
            disabled={selectionActionDisabled}
            value={currentFontFamily}
            onChange={(event) =>
              runToolbarCommand((chain) => chain.setFontFamily(event.target.value))
            }
          >
            {fontOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="rt-inline-field">
          A
          <input
            type="color"
            disabled={selectionActionDisabled}
            value={editor?.getAttributes('textStyle').color || '#172033'}
            onChange={(event) => runToolbarCommand((chain) => chain.setColor(event.target.value))}
          />
        </label>

        <label className="rt-inline-field">
          Размер
          <select
            disabled={selectionActionDisabled}
            value={String(editor?.getAttributes('textStyle').fontSize || '16px').replace('px', '')}
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
          Выравнивание
          <select
            disabled={selectionActionDisabled}
            value={currentAlign}
            onChange={(event) => {
              const nextAlign = event.target.value as 'left' | 'center' | 'right'
              runToolbarCommand((chain) => chain.setTextAlign(nextAlign))
              activeBinding?.onAlignChange?.(nextAlign)
            }}
          >
            <option value="left">Слева</option>
            <option value="center">По центру</option>
            <option value="right">Справа</option>
          </select>
        </label>
      </div>
    </div>
  )
}
