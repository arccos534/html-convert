import { useEffect, useRef } from 'react'
import { useRichTextToolbar } from '../blocks/RichTextToolbarContext'

const fontSizes = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]

const fontOptions = [
  {
    label: 'По умолчанию',
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

const buttonTitles: Record<string, string> = {
  B: 'Полужирный',
  I: 'Курсив',
  U: 'Подчёркнутый',
  Список: 'Маркированный список',
  '1.': 'Нумерованный список',
  '❝': 'Цитата',
  Ссылка: 'Установить ссылку',
}

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
    aria-label={buttonTitles[label]}
    aria-pressed={active}
    title={buttonTitles[label]}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </button>
)

export const GlobalRichTextToolbar = () => {
  const { activeBinding, lastSelection, refreshToolbar } = useRichTextToolbar()
  const moreRef = useRef<HTMLDetailsElement>(null)

  const bindingEditor = activeBinding?.editor
  const editor = bindingEditor && !bindingEditor.isDestroyed && bindingEditor.isEditable ? bindingEditor : null
  const isInactive = !editor
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (moreRef.current?.open && event.target instanceof Node && !moreRef.current.contains(event.target)) {
        moreRef.current.open = false
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  const fontFamily = normalizeFontFamily(editor?.getAttributes('textStyle').fontFamily)
  const currentFontFamily = fontOptions.find((option) => normalizeFontFamily(option.value) === fontFamily)?.value
    || fontOptions[0].value

  const selection = editor
    ? !editor.state.selection.empty
      ? { from: editor.state.selection.from, to: editor.state.selection.to }
      : lastSelection
    : null

  const selectionActionDisabled =
    isInactive || (Boolean(activeBinding?.requireSelectionForToolbarActions) && !selection)

  const runToolbarCommand = (command: (chain: import('@tiptap/core').ChainedCommands) => void) => {
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

  const headingLevel = editor?.getAttributes('heading').level as 1 | 2 | 3 | undefined
  const isBold = editor?.isActive('bold') ?? false
  const isItalic = editor?.isActive('italic') ?? false
  const isUnderline = editor?.isActive('underline') ?? false
  const isBulletList = editor?.isActive('bulletList') ?? false
  const isOrderedList = editor?.isActive('orderedList') ?? false
  const isBlockquote = editor?.isActive('blockquote') ?? false
  const isLink = editor?.isActive('link') ?? false

  return (
    <div className="global-rt-toolbar" role="group" aria-label="Форматирование текста">
      <div className="rt-toolbar">
        <select
          className="format-style"
          aria-label="Стиль абзаца"
          disabled={selectionActionDisabled}
          value={headingLevel ?? 0}
          onChange={(event) => {
            const level = Number(event.target.value) as 0 | 1 | 2 | 3
            runToolbarCommand((chain) => level === 0 ? chain.setParagraph() : chain.setHeading({ level }))
          }}
        >
          <option value={0}>Абзац</option>
          <option value={1}>Заголовок 1</option>
          <option value={2}>Заголовок 2</option>
          <option value={3}>Заголовок 3</option>
        </select>
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
          label="Список"
          disabled={selectionActionDisabled}
          onClick={() => runToolbarCommand((chain) => chain.toggleBulletList())}
          active={isBulletList}
        />
        {isInactive && <span className="format-hint">Выберите текст для форматирования</span>}
      </div>
      <details className="format-more" ref={moreRef} onKeyDown={(event) => {
        if (event.key === 'Escape' && moreRef.current?.open) {
          moreRef.current.open = false
          moreRef.current.querySelector('summary')?.focus()
        }
      }}>
        <summary className="ui-button" aria-label="Дополнительное форматирование" title="Дополнительное форматирование">
          <span aria-hidden="true">···</span>
        </summary>
        <div className="format-more-panel">
          <div className="format-more-actions">
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
              label="Ссылка"
              disabled={selectionActionDisabled}
              onClick={applyLink}
              active={isLink}
            />
          </div>

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
            Цвет
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
      </details>
    </div>
  )
}
