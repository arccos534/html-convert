import { useState } from 'react'
import { Modal } from './Modal'

interface AuthModalProps {
  onClose: () => void
  onLogin: (username: string, password: string) => Promise<void>
  onRegister: (username: string, password: string) => Promise<void>
}

export const AuthModal = ({ onClose, onLogin, onRegister }: AuthModalProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await onLogin(username, password)
      } else {
        await onRegister(username, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить вход.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal titleId="auth-title" className="auth-modal" onClose={() => { if (!busy) onClose() }}>
      <div className="modal-card auth-modal-card">
        <header>
          <div className="modal-title-group">
            <h2 id="auth-title">Аккаунт редактора</h2>
            <p>Аккаунт даёт доступ к сохранённым статьям с других устройств.</p>
          </div>
          <button className="ui-button icon-button" type="button" aria-label="Закрыть" disabled={busy} onClick={onClose}>×</button>
        </header>

        <form className="auth-modal-body" onSubmit={(event) => {
          event.preventDefault()
          if (!busy) void submit()
        }}>
          <div className="segmented panel-switch" role="group" aria-label="Тип входа">
            <button
              type="button"
              aria-pressed={mode === 'login'}
              disabled={busy}
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              Вход
            </button>
            <button
              type="button"
              aria-pressed={mode === 'register'}
              disabled={busy}
              onClick={() => {
                setMode('register')
                setError('')
              }}
            >
              Регистрация
            </button>
          </div>

          <label>
            Логин
            <input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>

          <label>
            Пароль
            <input
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-actions">
            <button type="submit" className="ui-button primary" disabled={busy}>
              {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
