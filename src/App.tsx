import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { RichTextToolbarProvider } from './components/blocks/RichTextToolbarContext'
import { AuthModal } from './components/editor/AuthModal'
import { BlockLibrary } from './components/editor/BlockLibrary'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { GlobalRichTextToolbar } from './components/editor/GlobalRichTextToolbar'
import { LivePreview } from './components/editor/LivePreview'
import { Modal } from './components/editor/Modal'
import { SettingsPanel } from './components/editor/SettingsPanel'
import { TopBar } from './components/editor/TopBar'
import { WorkspaceModal } from './components/editor/WorkspaceModal'
import { blockNames, createBlock } from './data/blockFactory'
import { createDemoDocument } from './data/demoArticle'
import { copyToClipboard, downloadTextFile, loadDraftFromStorage, readFileAsText, saveDraftToStorage } from './lib/documentIO'
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
import './EditorWorkspace.css'

interface EditorSnapshot {
  documentData: ArticleDocument
  selectedBlockId: string | null
}

const HISTORY_LIMIT = 80
const compactLayout = window.matchMedia('(max-width: 1000px)')
const subscribeToLayout = (onChange: () => void) => {
  compactLayout.addEventListener('change', onChange)
  return () => compactLayout.removeEventListener('change', onChange)
}
const getCompactLayout = () => compactLayout.matches
const pluralRules = new Intl.PluralRules('ru')
const blockCountLabel = (count: number) =>
  `${count} ${{ one: 'блок', few: 'блока', many: 'блоков', other: 'блока', zero: 'блоков', two: 'блока' }[pluralRules.select(count)]}`

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
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '') || 'article'

const getGuestDocument = () => {
  try {
    return normalizeDocument(loadDraftFromStorage()) ?? createDemoDocument()
  } catch {
    return createDemoDocument()
  }
}

function App() {
  const [documentData, setDocumentData] = useState<ArticleDocument>(getGuestDocument)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    documentData.blocks[0]?.id ?? null,
  )
  const [currentUser, setCurrentUser] = useState<AccountProfile | null>(null)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [savedWorkspaces, setSavedWorkspaces] = useState<SavedWorkspace[]>([])
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference())
  const [authReady, setAuthReady] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [workspaceSaving, setWorkspaceSaving] = useState(false)
  const [workspaceFeedback, setWorkspaceFeedback] = useState<{ message: string; error: boolean } | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [showPageSettings, setShowPageSettings] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [drawer, setDrawer] = useState<'library' | 'settings' | null>(null)
  const compact = useSyncExternalStore(subscribeToLayout, getCompactLayout)
  const editorScroll = useRef<HTMLDivElement>(null)
  const savedScrollPosition = useRef(0)
  const pendingScrollTarget = useRef<string | null>(null)
  const [savedDocument, setSavedDocument] = useState<ArticleDocument | null>(null)
  const [failedDocument, setFailedDocument] = useState<ArticleDocument | null>(null)
  const [retrySave, setRetrySave] = useState(0)
  const saveQueue = useRef(Promise.resolve())
  const pendingChartImports = useRef(new Map<string, symbol>())
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState<EditorSnapshot[]>([])
  const [future, setFuture] = useState<EditorSnapshot[]>([])

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

        if (!sessionUser) return

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
        setSavedDocument(autosave)
      } catch {
        if (cancelled) {
          return
        }

        setNotice('Работы из аккаунта сейчас недоступны.')
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
    if (!authReady || savedDocument === documentData) return

    const timer = window.setTimeout(() => {
      const save = async () => {
        try {
          if (currentUser) await saveUserAutosave(documentData)
          else saveDraftToStorage(documentData)
          setSavedDocument(documentData)
          setFailedDocument(null)
        } catch {
          setFailedDocument(documentData)
        }
      }
      if (currentUser) saveQueue.current = saveQueue.current.then(save)
      else void save()
    }, 500)

    return () => window.clearTimeout(timer)
  }, [authReady, currentUser, documentData, retrySave, savedDocument])

  useEffect(() => {
    if (!authReady || savedDocument === documentData) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [authReady, documentData, savedDocument])

  useLayoutEffect(() => {
    if (editorScroll.current) editorScroll.current.scrollTop = savedScrollPosition.current
  }, [previewMode])

  useLayoutEffect(() => {
    const id = pendingScrollTarget.current
    if (!id || previewMode) return
    document.getElementById(`block-${id}`)?.scrollIntoView({ block: 'nearest' })
    pendingScrollTarget.current = null
  })

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
    setShowPageSettings(false)
    savedScrollPosition.current = 0
    editorScroll.current?.scrollTo(0, 0)
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
    const blocks = [...documentData.blocks]
    const index = blocks.findIndex((item) => item.id === selectedBlockId)
    blocks.splice(index < 0 ? blocks.length : index + 1, 0, block)
    pendingScrollTarget.current = block.id
    setDrawer(null)
    setShowPageSettings(false)
    commitDocument({ ...documentData, blocks }, block.id)
    setNotice(`Добавлен блок «${blockNames[type]}»`)
  }

  const deleteBlock = (id: string) => {
    const index = documentData.blocks.findIndex((block) => block.id === id)
    const blocks = documentData.blocks.filter((block) => block.id !== id)
    const nextSelectedBlockId = selectedBlockId === id ? (blocks[index] ?? blocks[index - 1])?.id ?? null : selectedBlockId

    commitDocument({ ...documentData, blocks }, nextSelectedBlockId)
    setNotice('Блок удалён. Отменить можно на верхней панели.')
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
    pendingScrollTarget.current = duplicate.id
    setShowPageSettings(false)
    commitDocument({ ...documentData, blocks }, duplicate.id)
    setNotice('Копия блока добавлена')
  }

  const refreshWorkspaces = async () => {
    if (!currentUser) {
      setSavedWorkspaces([])
      return
    }

    const workspaces = await loadSavedWorkspaces()
    setSavedWorkspaces(workspaces)
  }

  const downloadDraft = () => {
    downloadTextFile(
      `${slugify(documentData.title)}.json`,
      JSON.stringify(documentData, null, 2),
      'application/json',
    )
    setNotice('Черновик JSON скачан')
  }

  const saveWorkspace = async () => {
    if (workspaceSaving) return
    setWorkspaceSaving(true)
    setWorkspaceFeedback(null)
    try {
      const nextWorkspaceId = await saveWorkspaceSnapshot(documentData, currentWorkspaceId)
      setCurrentWorkspaceId(nextWorkspaceId)
      await refreshWorkspaces()
      setWorkspaceFeedback({ message: 'Статья сохранена в «Моих работах».', error: false })
    } catch {
      setWorkspaceFeedback({ message: 'Не удалось сохранить работу. Попробуйте ещё раз.', error: true })
    } finally {
      setWorkspaceSaving(false)
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
      setPreviewMode(false)
      setNotice('JSON-черновик успешно импортирован')
    } catch {
      setNotice('Не удалось прочитать JSON-черновик')
    }
  }

  const copyHtml = async () => {
    try {
      await copyToClipboard(generateStandaloneHtml(documentData))
      setNotice('HTML скопирован в буфер обмена')
    } catch {
      setNotice('Не удалось скопировать HTML')
    }
  }

  const downloadHtml = () => {
    downloadTextFile(`${slugify(documentData.title)}.html`, generateStandaloneHtml(documentData), 'text/html')
    setNotice('HTML-файл скачан')
  }

  const handleLogin = async (username: string, password: string) => {
    const account = await loginAccount(username, password)
    const [autosave, workspaces] = await Promise.all([
      loadUserAutosave(),
      loadSavedWorkspaces().catch(() => []),
    ])

    setCurrentUser(account)
    setSavedWorkspaces(workspaces)
    if (autosave) replaceDocument(autosave, autosave.blocks[0]?.id ?? null)
    setSavedDocument(autosave)
    setCurrentWorkspaceId(null)
    setNotice(`С возвращением, ${account.username}`)
  }

  const handleRegister = async (username: string, password: string) => {
    const account = await registerAccount(username, password)

    setCurrentUser(account)
    setSavedWorkspaces([])
    setSavedDocument(null)
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
    const guestDocument = getGuestDocument()
    replaceDocument(guestDocument, guestDocument.blocks[0]?.id ?? null)
    setPreviewMode(false)
    setNotice('Вы вышли из аккаунта')
  }

  const handleLoadWorkspace = (workspace: SavedWorkspace) => {
    replaceDocument(workspace.document, workspace.document.blocks[0]?.id ?? null)
    setCurrentWorkspaceId(workspace.id)
    setWorkspaceModalOpen(false)
    setPreviewMode(false)
    setNotice(`Открыта работа: ${workspace.title}`)
  }

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (workspaceSaving) return
    setWorkspaceSaving(true)
    setWorkspaceFeedback(null)
    try {
      await deleteWorkspaceSnapshot(workspaceId)
      if (currentWorkspaceId === workspaceId) setCurrentWorkspaceId(null)
      await refreshWorkspaces()
      setWorkspaceFeedback({ message: 'Работа удалена.', error: false })
    } catch {
      setWorkspaceFeedback({ message: 'Не удалось удалить работу. Попробуйте ещё раз.', error: true })
    } finally {
      setWorkspaceSaving(false)
    }
  }

  const selectBlock = (id: string) => {
    setSelectedBlockId(id)
    setShowPageSettings(false)
  }

  const changeMode = (preview: boolean) => {
    if (preview === previewMode) return
    if (preview) savedScrollPosition.current = editorScroll.current?.scrollTop ?? 0
    setDrawer(null)
    setPreviewMode(preview)
  }

  const openLibrary = () => {
    const lastBlock = documentData.blocks.at(-1)
    if (lastBlock) selectBlock(lastBlock.id)
    setShowOutline(false)
    if (compact) {
      setDrawer('library')
    } else {
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.library-search input')?.focus())
    }
  }

  const startArticle = (example: boolean) => {
    const prompt = example ? 'Открыть пример вместо текущей статьи?' : 'Начать новую статью вместо текущей?'
    if (documentData.blocks.length > 0 && !window.confirm(prompt)) return

    const demo = createDemoDocument()
    const next = example ? demo : { ...demo, title: 'Новая статья', blocks: [] }
    pendingChartImports.current.clear()
    commitDocument(next, next.blocks[0]?.id ?? null)
    setCurrentWorkspaceId(null)
    setShowPageSettings(false)
    savedScrollPosition.current = 0
    editorScroll.current?.scrollTo(0, 0)
    setPreviewMode(false)
  }

  const library = (
    <BlockLibrary
      blocks={documentData.blocks}
      selectedBlockId={selectedBlockId}
      showOutline={showOutline}
      onChangeSection={setShowOutline}
      onAddBlock={addBlock}
      onJumpToBlock={(id) => {
        selectBlock(id)
        setDrawer(null)
        document.getElementById(`block-${id}`)?.scrollIntoView({ block: 'start' })
      }}
    />
  )
  const inspector = (
    <SettingsPanel
      block={selectedBlock}
      showPageSettings={showPageSettings}
      settings={documentData.settings}
      onUpdateBlock={updateBlock}
      onImportChart={importChart}
      onUpdateSettings={(settings) => commitDocument({ ...documentData, settings })}
      onChangeScope={setShowPageSettings}
    />
  )

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
          onDownloadDraft={downloadDraft}
          onLoadDraftFile={(file) => void loadDraftFile(file)}
          onChangeMode={changeMode}
          onCopyHtml={() => void copyHtml()}
          onDownloadHtml={downloadHtml}
          onOpenAccount={() => {
            if (currentUser) {
              setWorkspaceFeedback(null)
              setWorkspaceModalOpen(true)
            } else if (authReady) {
              setAuthModalOpen(true)
            }
          }}
          onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
          onLogout={() => void handleLogout()}
          onOpenExample={() => startArticle(true)}
          onNewArticle={() => startArticle(false)}
        />

        <div className={`workspace ${previewMode ? 'workspace-preview' : ''}`}>
          {!previewMode && !compact && library}

          <main className={`editor-main ${previewMode ? 'editor-main-preview' : ''}`}>
            {previewMode ? (
              <LivePreview documentData={documentData} compact={compact} />
            ) : (
              <>
                <div className="canvas-head">
                  <div className="canvas-heading">
                    <h1>Холст статьи</h1>
                    <span>{blockCountLabel(documentData.blocks.length)}</span>
                  </div>
                  {compact && (
                    <div className="canvas-panel-actions">
                      <button type="button" className="ui-button" aria-haspopup="dialog" onClick={() => setDrawer('library')}>Библиотека</button>
                      <button type="button" className="ui-button" aria-haspopup="dialog" onClick={() => setDrawer('settings')}>Параметры</button>
                    </div>
                  )}
                </div>
                <GlobalRichTextToolbar />
                <div className="editor-scroll" ref={editorScroll}>
                  <EditorCanvas
                    blocks={documentData.blocks}
                    selectedBlockId={selectedBlockId}
                    editable
                    onSelectBlock={selectBlock}
                    onChangeBlock={updateBlock}
                    onImportChart={importChart}
                    onDeleteBlock={deleteBlock}
                    onDuplicateBlock={duplicateBlock}
                    onReorderBlocks={(blocks) => commitDocument({ ...documentData, blocks })}
                    onOpenLibrary={openLibrary}
                  />
                </div>
              </>
            )}
          </main>

          {!previewMode && !compact && inspector}
        </div>

        {!previewMode && compact && drawer && (
          <Modal titleId="drawer-title" className="editor-drawer" onClose={() => setDrawer(null)}>
            <div className="drawer-body">
              <div className="drawer-header">
                <h2 id="drawer-title">{drawer === 'library' ? 'Библиотека' : 'Параметры'}</h2>
                <button type="button" className="ui-button icon-button" aria-label="Закрыть" onClick={() => setDrawer(null)}>×</button>
              </div>
              {drawer === 'library' ? library : inspector}
            </div>
          </Modal>
        )}
        {notice && <div className="notice" role="status">{notice}</div>}

        {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onLogin={handleLogin} onRegister={handleRegister} />}
        {workspaceModalOpen && (
          <WorkspaceModal
            saving={workspaceSaving}
            feedback={workspaceFeedback}
            workspaces={savedWorkspaces}
            onClose={() => { if (!workspaceSaving) setWorkspaceModalOpen(false) }}
            onSave={() => void saveWorkspace()}
            onLoad={handleLoadWorkspace}
            onDelete={(workspaceId) => void handleDeleteWorkspace(workspaceId)}
          />
        )}
      </div>
    </RichTextToolbarProvider>
  )
}

export default App
