import type { Editor } from '@tiptap/react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { TextAlign } from '../../types'

interface EditorSelection {
  from: number
  to: number
}

interface ActiveRichTextBinding {
  editor: Editor
  requireSelectionForToolbarActions: boolean
  onAlignChange?: (align: TextAlign) => void
}

interface RichTextToolbarContextValue {
  activeBinding: ActiveRichTextBinding | null
  lastSelection: EditorSelection | null
  version: number
  activateEditor: (binding: ActiveRichTextBinding) => void
  updateSelection: (selection: EditorSelection | null) => void
  refreshToolbar: () => void
}

const RichTextToolbarContext = createContext<RichTextToolbarContextValue | null>(null)

export const RichTextToolbarProvider = ({ children }: { children: ReactNode }) => {
  const [activeBinding, setActiveBinding] = useState<ActiveRichTextBinding | null>(null)
  const [lastSelection, setLastSelection] = useState<EditorSelection | null>(null)
  const [version, setVersion] = useState(0)

  const activateEditor = useCallback((binding: ActiveRichTextBinding) => {
    setActiveBinding(binding)
    const selection = binding.editor.state.selection
    setLastSelection(selection.empty ? null : { from: selection.from, to: selection.to })
    setVersion((prev) => prev + 1)
  }, [])

  const updateSelection = useCallback((selection: EditorSelection | null) => {
    setLastSelection(selection)
    setVersion((prev) => prev + 1)
  }, [])

  const refreshToolbar = useCallback(() => {
    setVersion((prev) => prev + 1)
  }, [])

  const value = useMemo(
    () => ({
      activeBinding,
      lastSelection,
      version,
      activateEditor,
      updateSelection,
      refreshToolbar,
    }),
    [activeBinding, lastSelection, version, activateEditor, updateSelection, refreshToolbar],
  )

  return <RichTextToolbarContext.Provider value={value}>{children}</RichTextToolbarContext.Provider>
}

export const useRichTextToolbar = () => {
  const context = useContext(RichTextToolbarContext)
  if (!context) {
    throw new Error('useRichTextToolbar must be used inside RichTextToolbarProvider')
  }

  return context
}
