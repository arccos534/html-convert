import { useRef } from 'react'
import type { ThemeMode } from '../../lib/localAccounts'
import { GlobalRichTextToolbar } from './GlobalRichTextToolbar'

interface TopBarProps {
  title: string
  previewMode: boolean
  canUndo: boolean
  canRedo: boolean
  currentUsername: string | null
  saveStatus: 'error' | 'saved' | 'pending'
  onRetrySave: () => void
  theme: ThemeMode
  onTitleChange: (title: string) => void
  onUndo: () => void
  onRedo: () => void
  onSaveDraft: () => void
  onLoadDraftFile: (file: File) => void
  onTogglePreview: () => void
  onCopyHtml: () => void
  onDownloadHtml: () => void
  onOpenWorkspaces: () => void
  onToggleTheme: () => void
  onLogout: () => void
  onResetDemo: () => void
}

export const TopBar = ({
  title,
  previewMode,
  canUndo,
  canRedo,
  currentUsername,
  theme,
  saveStatus,
  onRetrySave,
  onTitleChange,
  onUndo,
  onRedo,
  onSaveDraft,
  onLoadDraftFile,
  onTogglePreview,
  onCopyHtml,
  onDownloadHtml,
  onOpenWorkspaces,
  onToggleTheme,
  onLogout,
  onResetDemo,
}: TopBarProps) => {
  const moreRef = useRef<HTMLDetailsElement>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <header className="topbar">
      <div className="topbar-main">
        <div className="topbar-left">
          <p className="brand">Конструктор новостей Bitrix</p>
          <input
            className="title-input"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Название статьи"
            aria-label="Название статьи"
          />
          {currentUsername && <span className="autosave-status" role="status"><span>
            {saveStatus === 'saved' ? 'Черновик сохранён' : saveStatus === 'pending' ? 'Сохранение черновика…' : 'Черновик не сохранён'}
            </span>{saveStatus === 'error' && <button type="button" onClick={onRetrySave}>Повторить</button>}
          </span>}
        </div>

        <div className="topbar-actions">
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Отменить последнее действие" title="Отменить последнее действие">
            ↶
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Вернуть отменённое" title="Вернуть отменённое">
            ↷
          </button>
          <button type="button" onClick={onSaveDraft}>
            Сохранить
          </button>
          <button type="button" onClick={onOpenWorkspaces} className="ghost">
            Мои работы
          </button>
          <button type="button" onClick={onTogglePreview}>
            {previewMode ? 'Редактирование' : 'Предпросмотр'}
          </button>
          <button type="button" className="primary" onClick={onCopyHtml}>
            Копировать HTML
          </button>
          <details className="topbar-more" ref={moreRef} onKeyDown={(event) => {
            if (event.key === 'Escape' && moreRef.current?.open) {
              moreRef.current.open = false
              moreRef.current.querySelector('summary')?.focus()
            }
          }}>
            <summary>Ещё</summary>
            <div className="topbar-more-panel" onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('button') && moreRef.current) {
                moreRef.current.open = false
                moreRef.current.querySelector('summary')?.focus()
              }
            }}>
              <button type="button" onClick={onDownloadHtml}>Скачать HTML</button>
              <button type="button" onClick={() => fileInputRef.current?.click()}>Открыть черновик JSON</button>
              <button type="button" onClick={onToggleTheme}>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</button>
              <button type="button" onClick={() => {
                if (window.confirm('Открыть демонстрационный пример вместо текущего черновика?')) onResetDemo()
              }}>Открыть пример</button>
              {currentUsername && <button type="button" onClick={onLogout}>Выйти из аккаунта</button>}
            </div>
          </details>
        </div>
      </div>

      {!previewMode && <GlobalRichTextToolbar />}

      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="application/json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) {
            return
          }
          onLoadDraftFile(file)
          event.target.value = ''
        }}
      />
    </header>
  )
}
