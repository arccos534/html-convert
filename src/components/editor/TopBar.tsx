import { useRef } from 'react'

interface TopBarProps {
  title: string
  previewMode: boolean
  canUndo: boolean
  canRedo: boolean
  onTitleChange: (title: string) => void
  onUndo: () => void
  onRedo: () => void
  onSaveDraft: () => void
  onLoadDraftFile: (file: File) => void
  onTogglePreview: () => void
  onExportHtml: () => void
  onCopyHtml: () => void
  onDownloadHtml: () => void
  onLoadLocalDraft: () => void
  onResetDemo: () => void
}

export const TopBar = ({
  title,
  previewMode,
  canUndo,
  canRedo,
  onTitleChange,
  onUndo,
  onRedo,
  onSaveDraft,
  onLoadDraftFile,
  onTogglePreview,
  onExportHtml,
  onCopyHtml,
  onDownloadHtml,
  onLoadLocalDraft,
  onResetDemo,
}: TopBarProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <header className="topbar">
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
        <button type="button" onClick={onLoadLocalDraft}>
          Открыть
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="ghost"
        >
          Импорт JSON
        </button>
        <button type="button" onClick={onResetDemo} className="ghost">
          Демо
        </button>
        <button type="button" onClick={onTogglePreview}>
          {previewMode ? 'Редактирование' : 'Предпросмотр'}
        </button>
        <button type="button" onClick={onExportHtml}>
          Экспорт
        </button>
        <button type="button" onClick={onCopyHtml}>
          Копировать HTML
        </button>
        <button type="button" className="primary" onClick={onDownloadHtml}>
          Скачать HTML
        </button>
      </div>

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
