import type { ChainedCommands } from '@tiptap/core'
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useRichTextToolbar } from '../blocks/RichTextToolbarContext'
import { EditorIcon } from './EditorIcon'

const fontSizes = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]

const fontOptions = [
  {
    label: 'По умолчанию',
    value: '',
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
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toLowerCase()

const alignments = [
  { value: 'left', label: 'По левому краю' },
  { value: 'center', label: 'По центру' },
  { value: 'right', label: 'По правому краю' },
  { value: 'justify', label: 'По ширине' },
] as const

const narrowToolbar = window.matchMedia('(max-width: 680px)')
const subscribeToToolbar = (callback: () => void) => {
  narrowToolbar.addEventListener('change', callback)
  return () => narrowToolbar.removeEventListener('change', callback)
}
const getNarrowToolbar = () => narrowToolbar.matches

const colorValue = (value?: string) => {
  if (value && /^#[a-f\d]{6}$/i.test(value)) return value
  const rgb = value?.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  return rgb ? `#${rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}` : '#202226'
}

const ToolbarButton = ({ label, children, onClick, active, disabled }: {
  label: string
  children: ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) => (
  <button
    type="button"
    className={`rt-btn ${active ? 'is-active' : ''}`}
    aria-label={label}
    aria-pressed={active}
    title={label}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
)

export const GlobalRichTextToolbar = () => {
  const { activeBinding, lastSelection, refreshToolbar } = useRichTextToolbar()
  const compact = useSyncExternalStore(subscribeToToolbar, getNarrowToolbar)
  const moreRef = useRef<HTMLDetailsElement>(null)
  const bindingEditor = activeBinding?.editor
  const editor = bindingEditor && !bindingEditor.isDestroyed && bindingEditor.isEditable ? bindingEditor : null

  useEffect(() => {
    if (!compact) return
    const closeOutside = (event: PointerEvent) => {
      const details = moreRef.current
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [compact])

  const selection = editor
    ? editor.state.selection.empty ? lastSelection : { from: editor.state.selection.from, to: editor.state.selection.to }
    : null
  const disabled = !editor || Boolean(activeBinding?.requireSelectionForToolbarActions && !selection)
  const textStyle = editor?.getAttributes('textStyle')
  const appliedFont: string = textStyle?.fontFamily ?? ''
  const standardFont = fontOptions.find((option) => normalizeFontFamily(option.value) === normalizeFontFamily(appliedFont))
  const fontFamily = standardFont?.value ?? appliedFont
  const size = String(textStyle?.fontSize ?? '').replace(/px$/, '')
  const align = alignments.find(({ value }) => editor?.isActive({ textAlign: value }))?.value ?? activeBinding?.defaultAlign ?? 'left'
  const heading = Number(editor?.getAttributes('heading').level ?? 0)
  const insideLink = editor?.isActive('link') ?? false
  const hasLink = insideLink || Boolean(editor && selection && editor.state.doc.rangeHasMark(selection.from, selection.to, editor.schema.marks.link))

  const run = (command: (chain: ChainedCommands) => ChainedCommands, focus = true) => {
    if (disabled || !editor) return
    const chain = editor.chain()
    if (focus) chain.focus(undefined, { scrollIntoView: false })
    if (selection) chain.setTextSelection(selection)
    command(chain).run()
    if (focus && moreRef.current?.open) moreRef.current.open = false
    refreshToolbar()
  }

  const editLink = () => {
    const previous = editor?.getAttributes('link').href
    const url = window.prompt('Введите адрес ссылки', previous || 'https://')?.trim()
    if (url) run((chain) => (selection ? chain : chain.extendMarkRange('link')).setLink({ href: url }))
  }

  const additionalTools = (
    <>
      <div className="format-group" role="group" aria-label="Выравнивание">
        {alignments.map(({ value, label }) => (
          <ToolbarButton key={value} label={label} active={align === value} disabled={disabled} onClick={() => run((chain) => chain.setTextAlign(value))}>
            <EditorIcon name={value} />
          </ToolbarButton>
        ))}
      </div>
      <div className="format-group" role="group" aria-label="Списки и цитаты">
        <ToolbarButton label="Маркированный список" disabled={disabled} active={editor?.isActive('bulletList') ?? false} onClick={() => run((chain) => chain.toggleBulletList())}>
          <EditorIcon name="bullets" />
        </ToolbarButton>
        <ToolbarButton label="Нумерованный список" disabled={disabled} active={editor?.isActive('orderedList') ?? false} onClick={() => run((chain) => chain.toggleOrderedList())}>
          <EditorIcon name="numbers" />
        </ToolbarButton>
        <ToolbarButton label="Цитата" disabled={disabled} active={editor?.isActive('blockquote') ?? false} onClick={() => run((chain) => chain.toggleBlockquote())}>
          <EditorIcon name="quote" />
        </ToolbarButton>
      </div>
      <div className="format-group" role="group" aria-label="Ссылки и сброс оформления">
        <ToolbarButton label={insideLink ? 'Изменить ссылку' : 'Добавить ссылку'} disabled={disabled || !(selection || insideLink)} active={insideLink} onClick={editLink}>
          <EditorIcon name="link" />
        </ToolbarButton>
        <ToolbarButton label="Удалить ссылку" disabled={disabled || !hasLink} onClick={() => run((chain) => (selection ? chain : chain.extendMarkRange('link')).unsetLink())}>
          <EditorIcon name="unlink" />
        </ToolbarButton>
        <ToolbarButton label="Сбросить оформление текста" disabled={disabled || !selection} onClick={() => run((chain) => chain.unsetAllMarks())}>
          <EditorIcon name="reset" />
        </ToolbarButton>
      </div>
    </>
  )

  return (
    <div className="global-rt-toolbar" role="group" aria-label="Форматирование текста">
      <div className="format-group format-type" role="group" aria-label="Стиль и шрифт">
        <select aria-label="Стиль абзаца" title="Стиль абзаца" disabled={disabled} value={heading} onChange={(event) => {
          const level = Number(event.target.value) as 0 | 1 | 2 | 3
          run((chain) => level === 0 ? chain.setParagraph() : chain.setHeading({ level }))
        }}>
          <option value={0}>Абзац</option>
          <option value={1}>Заголовок 1</option>
          <option value={2}>Заголовок 2</option>
          <option value={3}>Заголовок 3</option>
        </select>
        <select aria-label="Семейство шрифта" title="Семейство шрифта" disabled={disabled} value={fontFamily} onChange={(event) => {
          const value = event.target.value
          run((chain) => value ? chain.setFontFamily(value) : chain.unsetFontFamily())
        }}>
          {!standardFont && <option value={appliedFont}>{appliedFont.split(',')[0].replace(/['"]/g, '')}</option>}
          {fontOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
        </select>
        <select aria-label="Размер текста" title="Размер текста" disabled={disabled} value={size} onChange={(event) => {
          const value = event.target.value
          run((chain) => value ? chain.setFontSize(`${value}px`) : chain.unsetFontSize())
        }}>
          <option value="">Авто</option>
          {size && !fontSizes.some((item) => String(item) === size) && <option value={size}>{size}</option>}
          {fontSizes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="format-group" role="group" aria-label="Начертание и цвет">
        <ToolbarButton label="Полужирный" disabled={disabled} active={editor?.isActive('bold') ?? false} onClick={() => run((chain) => chain.toggleBold())}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="Курсив" disabled={disabled} active={editor?.isActive('italic') ?? false} onClick={() => run((chain) => chain.toggleItalic())}><i>I</i></ToolbarButton>
        <ToolbarButton label="Подчёркнутый" disabled={disabled} active={editor?.isActive('underline') ?? false} onClick={() => run((chain) => chain.toggleUnderline())}><u>U</u></ToolbarButton>
        <label className="format-color" title="Цвет текста">
          <EditorIcon name="color" />
          <input type="color" aria-label="Цвет текста" disabled={disabled} value={colorValue(textStyle?.color)} onChange={(event) => {
            const value = event.target.value
            run((chain) => chain.setColor(value), false)
          }} />
        </label>
      </div>
      {compact ? (
        <details className="format-more" ref={moreRef} onKeyDown={(event) => {
          if (event.key !== 'Escape' || !moreRef.current?.open) return
          event.preventDefault()
          moreRef.current.open = false
          moreRef.current.querySelector('summary')?.focus()
        }}>
          <summary className="ui-button">Ещё <span className="menu-caret" aria-hidden="true" /></summary>
          <div className="format-more-panel">{additionalTools}</div>
        </details>
      ) : additionalTools}
    </div>
  )
}
