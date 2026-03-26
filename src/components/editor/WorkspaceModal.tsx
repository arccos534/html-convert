import type { SavedWorkspace } from '../../lib/localAccounts'

interface WorkspaceModalProps {
  open: boolean
  workspaces: SavedWorkspace[]
  onClose: () => void
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
  open,
  workspaces,
  onClose,
  onLoad,
  onDelete,
}: WorkspaceModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card workspace-modal-card">
        <header>
          <div className="modal-title-group">
            <h3>Мои работы</h3>
            <p>Сохранённые версии текущего аккаунта доступны после входа с любого устройства.</p>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </header>

        <div className="workspace-modal-body">
          {workspaces.length === 0 ? (
            <div className="empty-state workspace-empty-state">
              <p>Сохранённых работ пока нет. Нажмите «Сохранить», чтобы создать первую.</p>
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
                    <button type="button" onClick={() => onLoad(workspace)}>
                      Открыть
                    </button>
                    <button type="button" onClick={() => onDelete(workspace.id)}>
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
