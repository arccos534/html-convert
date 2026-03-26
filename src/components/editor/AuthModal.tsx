import { useState } from 'react'

interface AuthModalProps {
  open: boolean
  onLogin: (username: string, password: string) => Promise<void>
  onRegister: (username: string, password: string) => Promise<void>
}

export const AuthModal = ({ open, onLogin, onRegister }: AuthModalProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return null
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await onLogin(username, password)
      } else {
        await onRegister(username, password)
      }
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить вход.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card auth-modal-card">
        <header>
          <div className="modal-title-group">
            <h3>Аккаунт редактора</h3>
            <p>Работы и последняя версия будут храниться на сервере и откроются с любого устройства после входа.</p>
          </div>
        </header>

        <div className="auth-modal-body">
          <div className="auth-mode-switch">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => setMode('login')}
            >
              Вход
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => setMode('register')}
            >
              Регистрация
            </button>
          </div>

          <label>
            Логин
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>

          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !busy) {
                  void submit()
                }
              }}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="auth-actions">
            <button type="button" className="primary" onClick={() => void submit()} disabled={busy}>
              {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
