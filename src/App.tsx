import { useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { BlockLibrary } from './components/editor/BlockLibrary'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { HtmlModal } from './components/editor/HtmlModal'
import { LivePreview } from './components/editor/LivePreview'
import { SettingsPanel } from './components/editor/SettingsPanel'
import { TopBar } from './components/editor/TopBar'
import { blockTemplates, createBlock } from './data/blockFactory'
import { createDemoDocument } from './data/demoArticle'
import {
  copyToClipboard,
  downloadTextFile,
  loadDraftFromStorage,
  readFileAsText,
  saveDraftToStorage,
} from './lib/documentIO'
import { generateStandaloneHtml } from './lib/exportHtml'
import { normalizeColumnsData } from './lib/columns'
import { createDefaultHeroBackground } from './lib/heroBackground'
import type { ArticleBlock, ArticleDocument, ArticleSettings, BlockType } from './types'
import './App.css'

interface EditorSnapshot {
  documentData: ArticleDocument
  selectedBlockId: string | null
}

const HISTORY_LIMIT = 80

const normalizeDocument = (value: unknown): ArticleDocument | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const doc = value as Partial<ArticleDocument>

  if (!doc.blocks || !Array.isArray(doc.blocks)) {
    return null
  }

  if (!doc.settings || typeof doc.settings !== 'object') {
    return null
  }

  const defaultHeroBackground = createDefaultHeroBackground()
  const normalizedBlocks = (doc.blocks as ArticleBlock[]).map((block) => {
    if (block.type === 'hero') {
      const data = block.data as Partial<ArticleBlock['data']> & Record<string, unknown>

      return {
        ...block,
        data: {
          title: String(data.title || 'Заголовок главной новости'),
          subtitle: String(data.subtitle || ''),
          backgroundEnabled:
            typeof data.backgroundEnabled === 'boolean'
              ? data.backgroundEnabled
              : String(data.background || '').trim().length > 0 && data.background !== 'transparent',
          backgroundColorA: String(data.backgroundColorA || defaultHeroBackground.colorA),
          backgroundColorB: String(data.backgroundColorB || defaultHeroBackground.colorB),
          backgroundAngle: Number(data.backgroundAngle || defaultHeroBackground.angle),
          backgroundStopA: Number(data.backgroundStopA ?? defaultHeroBackground.stopA),
          backgroundStopB: Number(data.backgroundStopB ?? defaultHeroBackground.stopB),
          textColor: String(data.textColor || '#ffffff'),
          align: (data.align as 'left' | 'center' | 'right') || 'left',
        },
      } as ArticleBlock
    }

    if (block.type === 'columns') {
      const data = block.data as unknown as Record<string, unknown>

      return {
        ...block,
        data: normalizeColumnsData(data),
      } as ArticleBlock
    }

    if (block.type === 'image') {
      const data = block.data as unknown as Record<string, unknown>

      return {
        ...block,
        data: {
          src: String(data.src || ''),
          alt: String(data.alt || 'Изображение новости'),
          caption: String(data.caption || ''),
          textHtml: String(data.textHtml || ''),
          imageSide: data.imageSide === 'right' ? 'right' : 'left',
          width: Number(data.width || 100),
          align: (data.align as 'left' | 'center' | 'right') || 'center',
          radius: Number(data.radius || 14),
          shadow: Boolean(data.shadow),
          withPadding: Boolean(data.withPadding),
        },
      } as ArticleBlock
    }

    return block
  })

  return {
    version: Number(doc.version || 1),
    title: String(doc.title || 'Новая статья'),
    updatedAt: String(doc.updatedAt || new Date().toISOString()),
    settings: {
      pageWidth: Number((doc.settings as ArticleSettings).pageWidth || 980),
      baseFontSize: Number((doc.settings as ArticleSettings).baseFontSize || 17),
      includeImagesAsBase64: Boolean((doc.settings as ArticleSettings).includeImagesAsBase64),
    },
    blocks: normalizedBlocks,
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '') || 'article'

function App() {
  const [documentData, setDocumentData] = useState<ArticleDocument>(() => {
    const loaded = loadDraftFromStorage()
    return loaded ?? createDemoDocument()
  })
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    documentData.blocks[0]?.id ?? null,
  )
  const [previewMode, setPreviewMode] = useState(false)
  const [isHtmlModalOpen, setHtmlModalOpen] = useState(false)
  const [notice, setNotice] = useState<string>('')
  const [history, setHistory] = useState<EditorSnapshot[]>([])
  const [future, setFuture] = useState<EditorSnapshot[]>([])

  const exportedHtml = useMemo(() => generateStandaloneHtml(documentData), [documentData])

  const selectedBlock = useMemo(
    () => documentData.blocks.find((block) => block.id === selectedBlockId) ?? null,
    [documentData.blocks, selectedBlockId],
  )

  useEffect(() => {
    if (!notice) {
      return
    }

    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const commitDocument = (
    nextDocumentData: ArticleDocument,
    nextSelectedBlockId: string | null = selectedBlockId,
  ) => {
    setHistory((prev) => [
      ...prev.slice(-(HISTORY_LIMIT - 1)),
      { documentData, selectedBlockId },
    ])
    setFuture([])
    setDocumentData({
      ...nextDocumentData,
      updatedAt: new Date().toISOString(),
    })
    setSelectedBlockId(nextSelectedBlockId)
  }

  const replaceDocument = (nextDocumentData: ArticleDocument, nextSelectedBlockId: string | null) => {
    setDocumentData(nextDocumentData)
    setSelectedBlockId(nextSelectedBlockId)
    setHistory([])
    setFuture([])
  }

  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) {
      return
    }

    setHistory((prev) => prev.slice(0, -1))
    setFuture((prev) => [
      { documentData, selectedBlockId },
      ...prev.slice(0, HISTORY_LIMIT - 1),
    ])
    setDocumentData(previous.documentData)
    setSelectedBlockId(previous.selectedBlockId)
  }

  const redo = () => {
    const next = future[0]
    if (!next) {
      return
    }

    setFuture((prev) => prev.slice(1))
    setHistory((prev) => [
      ...prev.slice(-(HISTORY_LIMIT - 1)),
      { documentData, selectedBlockId },
    ])
    setDocumentData(next.documentData)
    setSelectedBlockId(next.selectedBlockId)
  }

  const updateBlock = (updated: ArticleBlock) => {
    commitDocument({
      ...documentData,
      blocks: documentData.blocks.map((block) => (block.id === updated.id ? updated : block)),
    })
  }

  const addBlock = (type: BlockType) => {
    const block = createBlock(type)
    commitDocument(
      { ...documentData, blocks: [...documentData.blocks, block] },
      block.id,
    )
    setNotice(`Добавлен блок: ${type}`)
  }

  const deleteBlock = (id: string) => {
    const blocks = documentData.blocks.filter((block) => block.id !== id)
    const nextSelectedBlockId =
      selectedBlockId === id ? blocks[0]?.id ?? null : selectedBlockId

    commitDocument({ ...documentData, blocks }, nextSelectedBlockId)
  }

  const duplicateBlock = (id: string) => {
    const index = documentData.blocks.findIndex((block) => block.id === id)
    if (index === -1) {
      return
    }

    const source = documentData.blocks[index]
    const duplicate = JSON.parse(JSON.stringify(source)) as ArticleBlock
    duplicate.id = uuidv4()

    const blocks = [...documentData.blocks]
    blocks.splice(index + 1, 0, duplicate)
    commitDocument({ ...documentData, blocks }, duplicate.id)
  }

  const saveDraft = () => {
    saveDraftToStorage(documentData)
    downloadTextFile(
      `${slugify(documentData.title)}.json`,
      JSON.stringify(documentData, null, 2),
      'application/json',
    )
    setNotice('Черновик сохранен в localStorage и JSON-файл')
  }

  const loadLocalDraft = () => {
    const draft = loadDraftFromStorage()
    if (!draft) {
      setNotice('Черновик в localStorage не найден')
      return
    }

    replaceDocument(draft, draft.blocks[0]?.id ?? null)
    setNotice('Черновик загружен из localStorage')
  }

  const loadDraftFile = async (file: File) => {
    try {
      const content = await readFileAsText(file)
      const parsed = normalizeDocument(JSON.parse(content))

      if (!parsed) {
        setNotice('Неверный JSON-формат черновика')
        return
      }

      replaceDocument(parsed, parsed.blocks[0]?.id ?? null)
      setNotice('JSON-черновик успешно импортирован')
    } catch {
      setNotice('Не удалось прочитать JSON-черновик')
    }
  }

  const copyHtml = async () => {
    try {
      await copyToClipboard(exportedHtml)
      setNotice('HTML скопирован в буфер обмена')
    } catch {
      setNotice('Не удалось скопировать HTML')
    }
  }

  const downloadHtml = () => {
    downloadTextFile(`${slugify(documentData.title)}.html`, exportedHtml, 'text/html')
    setNotice('HTML-файл скачан')
  }

  return (
    <div className="app-shell">
      <TopBar
        title={documentData.title}
        previewMode={previewMode}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onTitleChange={(title) => commitDocument({ ...documentData, title })}
        onUndo={undo}
        onRedo={redo}
        onSaveDraft={saveDraft}
        onLoadLocalDraft={loadLocalDraft}
        onLoadDraftFile={loadDraftFile}
        onTogglePreview={() => setPreviewMode((value) => !value)}
        onExportHtml={() => setHtmlModalOpen(true)}
        onCopyHtml={copyHtml}
        onDownloadHtml={downloadHtml}
        onResetDemo={() => {
          const demo = createDemoDocument()
          replaceDocument(demo, demo.blocks[0]?.id ?? null)
          setNotice('Загружена демо-страница')
        }}
      />

      <div className={`workspace ${previewMode ? 'workspace-preview' : ''}`}>
        {!previewMode && <BlockLibrary templates={blockTemplates} onAddBlock={addBlock} />}

        <main className={`editor-main ${previewMode ? 'editor-main-preview' : ''}`}>
          {previewMode ? (
            <LivePreview documentData={documentData} />
          ) : (
            <EditorCanvas
              blocks={documentData.blocks}
              selectedBlockId={selectedBlockId}
              editable={!previewMode}
              onSelectBlock={setSelectedBlockId}
              onChangeBlock={updateBlock}
              onDeleteBlock={deleteBlock}
              onDuplicateBlock={duplicateBlock}
              onReorderBlocks={(blocks) => commitDocument({ ...documentData, blocks })}
            />
          )}
        </main>

        {!previewMode && (
          <SettingsPanel
            block={selectedBlock}
            settings={documentData.settings}
            onUpdateBlock={updateBlock}
            onUpdateSettings={(settings) => commitDocument({ ...documentData, settings })}
          />
        )}
      </div>

      {notice && <div className="notice">{notice}</div>}

      <HtmlModal
        open={isHtmlModalOpen}
        html={exportedHtml}
        onClose={() => setHtmlModalOpen(false)}
        onCopy={copyHtml}
        onDownload={downloadHtml}
      />
    </div>
  )
}

export default App


