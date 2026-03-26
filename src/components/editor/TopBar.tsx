import { useRef } from 'react'
import type { ThemeMode } from '../../lib/localAccounts'
import { GlobalRichTextToolbar } from './GlobalRichTextToolbar'

interface TopBarProps {
  title: string
  previewMode: boolean
  canUndo: boolean
  canRedo: boolean
  currentUsername: string | null
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
          />
        </div>

        <div className="topbar-actions">
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Отменить последнее действие">
            ↶
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Вернуть отмененное">
            ↷
          </button>
          <button type="button" onClick={onSaveDraft}>
            Сохранить
          </button>
          <button type="button" onClick={onOpenWorkspaces} className="ghost">
            Мои работы
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="ghost">
            Импорт JSON
          </button>
          <button type="button" onClick={onResetDemo} className="ghost">
            Демо
          </button>
          <button type="button" onClick={onToggleTheme} className="ghost">
            {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          </button>
          <button type="button" onClick={onTogglePreview}>
            {previewMode ? 'Редактирование' : 'Предпросмотр'}
          </button>
          <button type="button" onClick={onCopyHtml}>
            Копировать HTML
          </button>
          <button type="button" className="primary" onClick={onDownloadHtml}>
            Скачать HTML
          </button>
          {currentUsername ? <span className="topbar-user">{currentUsername}</span> : null}
          {currentUsername ? (
            <button type="button" onClick={onLogout}>
              Выйти
            </button>
          ) : null}
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
