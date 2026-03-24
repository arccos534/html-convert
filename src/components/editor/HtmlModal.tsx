interface HtmlModalProps {
  open: boolean
  html: string
  onClose: () => void
  onCopy: () => void
  onDownload: () => void
}

export const HtmlModal = ({ open, html, onClose, onCopy, onDownload }: HtmlModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header>
          <div className="modal-title-group">
            <h3>HTML для Bitrix</h3>
            <p>Загруженные файлы изображений уже встроены в код HTML.</p>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onCopy}>
              Копировать
            </button>
            <button type="button" onClick={onDownload}>
              Скачать
            </button>
            <button type="button" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </header>
        <textarea readOnly value={html} rows={20} />
      </div>
    </div>
  )
}
