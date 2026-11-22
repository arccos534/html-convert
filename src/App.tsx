import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { RichTextToolbarProvider } from './components/blocks/RichTextToolbarContext'
import { AuthModal } from './components/editor/AuthModal'
import { BlockLibrary } from './components/editor/BlockLibrary'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { LivePreview } from './components/editor/LivePreview'
import { SettingsPanel } from './components/editor/SettingsPanel'
import { TopBar } from './components/editor/TopBar'
import { WorkspaceModal } from './components/editor/WorkspaceModal'
import { blockTemplates, createBlock } from './data/blockFactory'
import { createDemoDocument } from './data/demoArticle'
import { copyToClipboard, downloadTextFile, loadDraftFromStorage, readFileAsText } from './lib/documentIO'
import { importChartFile } from './lib/chartImport'
import { generateStandaloneHtml } from './lib/exportHtml'
import {
  deleteWorkspaceSnapshot,
  fetchCurrentSession,
  loadSavedWorkspaces,
  loadThemePreference,
  loadUserAutosave,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveThemePreference,
  saveUserAutosave,
  saveWorkspaceSnapshot,
  type AccountProfile,
  type SavedWorkspace,
  type ThemeMode,
} from './lib/localAccounts'
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
          titleHtml: String(
            data.titleHtml || `<h1>${String(data.title || 'Заголовок главной новости')}</h1>`,
          ),
          subtitle: String(data.subtitle || ''),
          subtitleHtml: String(data.subtitleHtml || `<p>${String(data.subtitle || '')}</p>`),
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
          alt: String(data.alt ?? 'Изображение новости'),
          caption: String(data.caption || ''),
          textHtml: String(data.textHtml || ''),
          imageSide: data.imageSide === 'right' ? 'right' : 'left',
          textLayout: data.textLayout === 'wrap' || data.textLayout === 'stack' ? data.textLayout : 'columns',
          textGap: typeof data.textGap === 'number' ? data.textGap : undefined,
          textPosition: data.textPosition === 'center' || data.textPosition === 'end' ? data.textPosition : 'start',
          stackOrder: data.stackOrder === 'text-first' ? 'text-first' : 'image-first',
          width: Number(data.width || 100),
          align: (data.align as 'left' | 'center' | 'right') || 'center',
          radius: Number(data.radius ?? 14),
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
  const [documentData, setDocumentData] = useState<ArticleDocument>(() => createDemoDocument())
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    documentData.blocks[0]?.id ?? null,
  )
  const [currentUser, setCurrentUser] = useState<AccountProfile | null>(null)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [savedWorkspaces, setSavedWorkspaces] = useState<SavedWorkspace[]>([])
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference())
  const [authReady, setAuthReady] = useState(false)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [savedDocument, setSavedDocument] = useState<ArticleDocument | null>(null)
  const [failedDocument, setFailedDocument] = useState<ArticleDocument | null>(null)
  const [retrySave, setRetrySave] = useState(0)
  const saveQueue = useRef(Promise.resolve())
  const pendingChartImports = useRef(new Map<string, symbol>())
  const [notice, setNotice] = useState('')
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveThemePreference(theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const sessionUser = await fetchCurrentSession()
        if (cancelled) {
          return
        }

        if (!sessionUser) {
          const demo = createDemoDocument()
          setCurrentUser(null)
          setSavedWorkspaces([])
          setDocumentData(demo)
          setSelectedBlockId(demo.blocks[0]?.id ?? null)
          return
        }

        const legacyDraft = loadDraftFromStorage()
        const [autosave, workspaces] = await Promise.all([
          loadUserAutosave(),
          loadSavedWorkspaces().catch(() => []),
        ])

        if (cancelled) {
          return
        }

        const nextDocument = autosave ?? legacyDraft ?? createDemoDocument()
        setCurrentUser(sessionUser)
        setSavedWorkspaces(workspaces)
        setDocumentData(nextDocument)
        setSelectedBlockId(nextDocument.blocks[0]?.id ?? null)
      } catch {
        if (cancelled) {
          return
        }

        setNotice('Не удалось загрузить черновик с сервера. Войдите повторно.')
        const demo = createDemoDocument()
        setCurrentUser(null)
        setSavedWorkspaces([])
        setDocumentData(demo)
        setSelectedBlockId(demo.blocks[0]?.id ?? null)
      } finally {
        if (!cancelled) {
          setAuthReady(true)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!authReady || !currentUser) {
      return
    }

    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          await saveUserAutosave(documentData)
          setSavedDocument(documentData)
          setFailedDocument(null)
        } catch {
          setFailedDocument(documentData)
        }
      })
    }, 500)

    return () => window.clearTimeout(timer)
  }, [authReady, currentUser, documentData, retrySave])

  useEffect(() => {
    if (!currentUser || savedDocument === documentData) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [currentUser, documentData, savedDocument])

  const commitDocument = (
    nextDocumentData: ArticleDocument,
    nextSelectedBlockId: string | null = selectedBlockId,
  ) => {
    const previous = chartImportTarget.current.documentData
    const updated = {
      ...nextDocumentData,
      updatedAt: new Date().toISOString(),
    }
    chartImportTarget.current.documentData = updated
    setHistory((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), { documentData: previous, selectedBlockId }])
    setFuture([])
    setDocumentData(updated)
    setSelectedBlockId(nextSelectedBlockId)
  }

  const replaceDocument = (nextDocumentData: ArticleDocument, nextSelectedBlockId: string | null) => {
    pendingChartImports.current.clear()
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
    setFuture((prev) => [{ documentData, selectedBlockId }, ...prev.slice(0, HISTORY_LIMIT - 1)])
    pendingChartImports.current.clear()
    setDocumentData(previous.documentData)
    setSelectedBlockId(previous.selectedBlockId)
  }

  const redo = () => {
    const next = future[0]
    if (!next) {
      return
    }

    setFuture((prev) => prev.slice(1))
    setHistory((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), { documentData, selectedBlockId }])
    pendingChartImports.current.clear()
    setDocumentData(next.documentData)
    setSelectedBlockId(next.selectedBlockId)
  }

  const updateBlock = (updated: ArticleBlock) => {
    const latest = chartImportTarget.current.documentData
    commitDocument({
      ...latest,
      blocks: latest.blocks.map((block) => (block.id === updated.id ? updated : block)),
    })
  }

  const chartImportTarget = useRef({ documentData, updateBlock })
  useLayoutEffect(() => {
    chartImportTarget.current = { documentData, updateBlock }
  })

  const importChart = async (blockId: string, file: File) => {
    const pending = pendingChartImports.current
    const request = Symbol()
    pending.set(blockId, request)

    try {
      const data = await importChartFile(file)
      if (pending.get(blockId) !== request) {
        return
      }

      const current = chartImportTarget.current
      const block = current.documentData.blocks.find((item) => item.id === blockId)
      if (block?.type === 'chart') {
        current.updateBlock({ ...block, data: { ...block.data, ...data } })
      }
    } catch {
      if (pending.get(blockId) === request) {
        setNotice('Не удалось импортировать файл. Проверьте формат и содержимое.')
      }
    } finally {
      if (pending.get(blockId) === request) {
        pending.delete(blockId)
      }
    }
  }

  const addBlock = (type: BlockType) => {
    const block = createBlock(type)
    commitDocument({ ...documentData, blocks: [...documentData.blocks, block] }, block.id)
    setNotice(`Добавлен блок: ${type}`)
  }

  const deleteBlock = (id: string) => {
    const blocks = documentData.blocks.filter((block) => block.id !== id)
    const nextSelectedBlockId = selectedBlockId === id ? blocks[0]?.id ?? null : selectedBlockId

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

  const refreshWorkspaces = async () => {
    if (!currentUser) {
      setSavedWorkspaces([])
      return
    }

    const workspaces = await loadSavedWorkspaces()
    setSavedWorkspaces(workspaces)
  }

  const saveDraft = async () => {
    downloadTextFile(
      `${slugify(documentData.title)}.json`,
      JSON.stringify(documentData, null, 2),
      'application/json',
    )
    try {
      if (currentUser) {
        const nextWorkspaceId = await saveWorkspaceSnapshot(documentData, currentWorkspaceId)
        setCurrentWorkspaceId(nextWorkspaceId)
        await refreshWorkspaces()
      }
      setNotice(currentUser ? 'Работа сохранена, JSON скачан' : 'JSON-файл скачан')
    } catch {
      setNotice('Не удалось сохранить работу на сервере. Копия в JSON скачана.')
    }
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
      setCurrentWorkspaceId(null)
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

  const handleLogin = async (username: string, password: string) => {
    const account = await loginAccount(username, password)
    const [autosave, workspaces] = await Promise.all([
      loadUserAutosave(),
      loadSavedWorkspaces().catch(() => []),
    ])

    const nextDocument = autosave ?? createDemoDocument()
    setCurrentUser(account)
    setSavedWorkspaces(workspaces)
    replaceDocument(nextDocument, nextDocument.blocks[0]?.id ?? null)
    setCurrentWorkspaceId(null)
    setNotice(`С возвращением, ${account.username}`)
  }

  const handleRegister = async (username: string, password: string) => {
    const account = await registerAccount(username, password)
    const legacyDraft = loadDraftFromStorage()
    const nextDocument = legacyDraft ?? createDemoDocument()

    setCurrentUser(account)
    setSavedWorkspaces([])
    replaceDocument(nextDocument, nextDocument.blocks[0]?.id ?? null)
    setCurrentWorkspaceId(null)
    setNotice(`Аккаунт ${account.username} создан`)
  }

  const handleLogout = async () => {
    try {
      await saveQueue.current
      if (savedDocument !== documentData) {
        await saveUserAutosave(documentData)
      }
      await logoutAccount()
    } catch {
      setNotice('Не удалось выйти. Проверьте подключение и сохраните копию черновика.')
      return
    }

    setCurrentUser(null)
    setSavedWorkspaces([])
    setCurrentWorkspaceId(null)
    const demo = createDemoDocument()
    replaceDocument(demo, demo.blocks[0]?.id ?? null)
    setPreviewMode(false)
    setNotice('Вы вышли из аккаунта')
  }

  const handleLoadWorkspace = async (workspace: SavedWorkspace) => {
    replaceDocument(workspace.document, workspace.document.blocks[0]?.id ?? null)
    setCurrentWorkspaceId(workspace.id)
    setWorkspaceModalOpen(false)
    setNotice(`Открыта работа: ${workspace.title}`)
  }

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!currentUser) {
      return
    }

    await deleteWorkspaceSnapshot(workspaceId)
    if (currentWorkspaceId === workspaceId) {
      setCurrentWorkspaceId(null)
    }
    await refreshWorkspaces()
    setNotice('Работа удалена')
  }

  return (
    <RichTextToolbarProvider>
      <div className="app-shell">
        <TopBar
          title={documentData.title}
          previewMode={previewMode}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          currentUsername={currentUser?.username ?? null}
          saveStatus={failedDocument === documentData ? 'error' : savedDocument === documentData ? 'saved' : 'pending'}
          onRetrySave={() => {
            setFailedDocument(null)
            setRetrySave((value) => value + 1)
          }}
          theme={theme}
          onTitleChange={(title) => commitDocument({ ...documentData, title })}
          onUndo={undo}
          onRedo={redo}
          onSaveDraft={() => void saveDraft()}
          onLoadDraftFile={(file) => void loadDraftFile(file)}
          onTogglePreview={() => setPreviewMode((value) => !value)}
          onCopyHtml={() => void copyHtml()}
          onDownloadHtml={downloadHtml}
          onOpenWorkspaces={() => setWorkspaceModalOpen(true)}
          onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
          onLogout={() => void handleLogout()}
          onResetDemo={() => {
            const demo = createDemoDocument()
            replaceDocument(demo, demo.blocks[0]?.id ?? null)
            setCurrentWorkspaceId(null)
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
                onImportChart={importChart}
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
              onImportChart={importChart}
              onUpdateSettings={(settings) => commitDocument({ ...documentData, settings })}
            />
          )}
        </div>

        {notice && <div className="notice" role="status">{notice}</div>}

        <AuthModal
          open={authReady && !currentUser}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />

        <WorkspaceModal
          open={workspaceModalOpen}
          workspaces={savedWorkspaces}
          onClose={() => setWorkspaceModalOpen(false)}
          onLoad={(workspace) => void handleLoadWorkspace(workspace)}
          onDelete={(workspaceId) => void handleDeleteWorkspace(workspaceId)}
        />
      </div>
    </RichTextToolbarProvider>
  )
}

export default App
