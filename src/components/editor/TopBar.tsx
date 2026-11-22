import { useEffect, useRef } from 'react'
import type { ThemeMode } from '../../lib/localAccounts'

interface TopBarProps {
  title: string
  previewMode: boolean
  canUndo: boolean
  canRedo: boolean
  currentUsername: string | null
  saveStatus: 'error' | 'saved' | 'pending'
  theme: ThemeMode
  onRetrySave: () => void
  onTitleChange: (title: string) => void
  onUndo: () => void
  onRedo: () => void
  onDownloadDraft: () => void
  onLoadDraftFile: (file: File) => void
  onChangeMode: (preview: boolean) => void
  onCopyHtml: () => void
  onDownloadHtml: () => void
  onOpenAccount: () => void
  onToggleTheme: () => void
  onLogout: () => void
  onOpenExample: () => void
  onNewArticle: () => void
}

export const TopBar = ({
  title, previewMode, canUndo, canRedo, currentUsername, saveStatus, theme,
  onRetrySave, onTitleChange, onUndo, onRedo, onDownloadDraft, onLoadDraftFile,
  onChangeMode, onCopyHtml, onDownloadHtml, onOpenAccount, onToggleTheme, onLogout,
  onOpenExample, onNewArticle,
}: TopBarProps) => {
  const moreRef = useRef<HTMLDetailsElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (moreRef.current?.open && event.target instanceof Node && !moreRef.current.contains(event.target)) {
        moreRef.current.open = false
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  const closeMenu = () => {
    if (!moreRef.current?.open) return
    moreRef.current.open = false
    moreRef.current.querySelector('summary')?.focus()
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark" aria-hidden="true"><i /></span>
        <div className="brand-copy">
          <strong>HTML Convert</strong>
          <span>Редактор для Bitrix</span>
        </div>
      </div>

      <div className="topbar-document">
        <input
          className="title-input"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Название черновика"
          aria-label="Название черновика"
        />
        <div className={`autosave-status is-${saveStatus}`}>
          <span role="status">
            {saveStatus === 'saved' ? (currentUsername ? 'Сохранено в аккаунте' : 'Сохранено в браузере')
              : saveStatus === 'pending' ? 'Сохранение…' : 'Не удалось сохранить'}
          </span>
          {saveStatus === 'error' && <button type="button" onClick={onRetrySave}>Повторить</button>}
        </div>
      </div>

      <div className="topbar-mode segmented" role="group" aria-label="Режим работы">
        <button type="button" aria-pressed={!previewMode} onClick={() => onChangeMode(false)}>Редактор</button>
        <button type="button" aria-pressed={previewMode} onClick={() => onChangeMode(true)}>Предпросмотр</button>
      </div>

      {!previewMode && (
        <div className="topbar-history" role="group" aria-label="История изменений">
          <button type="button" className="ui-button icon-button" aria-label="Отменить действие" title="Отменить действие" onClick={onUndo} disabled={!canUndo}>↶</button>
          <button type="button" className="ui-button icon-button" aria-label="Вернуть действие" title="Вернуть действие" onClick={onRedo} disabled={!canRedo}>↷</button>
        </div>
      )}

      <div className="topbar-actions">
        <button className="account-button ui-button" type="button" onClick={onOpenAccount}>
          {currentUsername ? 'Мои работы' : 'Войти'}
        </button>
        <button className="ui-button primary export-button" type="button" aria-label="Копировать HTML" onClick={onCopyHtml}>
          <span className="ui-icon icon-copy" aria-hidden="true" />
          <span><span className="export-verb">Копировать </span>HTML</span>
        </button>
        <details className="topbar-more" ref={moreRef} onKeyDown={(event) => {
          if (event.key === 'Escape' && moreRef.current?.open) {
            event.preventDefault()
            closeMenu()
          }
        }}>
          <summary className="ui-button icon-button" aria-label="Ещё действия" title="Ещё действия">···</summary>
          <div className="topbar-more-panel" onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('button')) closeMenu()
          }}>
            <button type="button" onClick={onDownloadHtml}>Скачать HTML</button>
            <button type="button" onClick={onDownloadDraft}>Скачать черновик JSON</button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>Открыть черновик JSON</button>
            <div className="menu-divider" />
            <button type="button" onClick={onNewArticle}>Новая статья</button>
            <button type="button" onClick={onOpenExample}>Открыть пример</button>
            <div className="menu-divider" />
            <button type="button" onClick={onToggleTheme}>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</button>
            {currentUsername && <button type="button" onClick={onLogout}>Выйти из аккаунта</button>}
          </div>
        </details>
      </div>

      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept=".json,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onLoadDraftFile(file)
          event.target.value = ''
        }}
      />
    </header>
  )
}
