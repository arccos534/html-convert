import type { SavedWorkspace } from '../../lib/localAccounts'
import { Modal } from './Modal'

interface WorkspaceModalProps {
  saving: boolean
  feedback: { message: string; error: boolean } | null
  workspaces: SavedWorkspace[]
  onClose: () => void
  onSave: () => void
  onLoad: (workspace: SavedWorkspace) => void
  onDelete: (workspaceId: string) => void
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export const WorkspaceModal = ({
  saving,
  feedback,
  workspaces,
  onClose,
  onSave,
  onLoad,
  onDelete,
}: WorkspaceModalProps) => {
  return (
    <Modal titleId="workspace-title" className="workspace-modal" onClose={onClose}>
      <div className="modal-card workspace-modal-card">
        <header>
          <div className="modal-title-group">
            <h2 id="workspace-title">Мои работы</h2>
            <p>Сохраняйте статьи здесь, чтобы возвращаться к ним из аккаунта.</p>
          </div>
          <div className="modal-actions">
            <button className="ui-button icon-button" type="button" aria-label="Закрыть" disabled={saving} onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <div className="workspace-modal-body">
          <button className="ui-button primary" type="button" disabled={saving} onClick={onSave}>
            {saving ? 'Сохранение…' : 'Сохранить текущую статью'}
          </button>
          {feedback && (
            <p className={feedback.error ? 'auth-error' : 'workspace-feedback'} role={feedback.error ? 'alert' : 'status'}>
              {feedback.message}
            </p>
          )}
          {workspaces.length === 0 ? (
            <div className="empty-state workspace-empty-state">
              <p>Сохранённых работ пока нет.</p>
            </div>
          ) : (
            <div className="workspace-list">
              {workspaces.map((workspace) => (
                <article key={workspace.id} className="workspace-item">
                  <div className="workspace-item-copy">
                    <strong>{workspace.title}</strong>
                    <span>{formatDate(workspace.updatedAt)}</span>
                  </div>
                  <div className="workspace-item-actions">
                    <button className="ui-button" type="button" disabled={saving} onClick={() => onLoad(workspace)}>
                      Открыть
                    </button>
                    <button className="ui-button" type="button" disabled={saving} onClick={() => {
                      if (window.confirm(`Удалить «${workspace.title}» из сохранённых работ?`)) onDelete(workspace.id)
                    }}>
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
