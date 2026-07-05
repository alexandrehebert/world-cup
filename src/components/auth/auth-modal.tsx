/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'

type AuthResult = { ok: true } | { ok: false; error: string }

export const AuthModal = () => {
  const { t } = useLocale()
  const {
    user,
    isLoading,
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    closeAuthModal,
    login,
    register,
  } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAuthModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeAuthModal, isAuthModalOpen])

  useEffect(() => {
    setAuthError(null)
  }, [authModalMode, isAuthModalOpen])

  useEffect(() => {
    if (user) {
      setUsername('')
      setPassword('')
      setAuthError(null)
      setIsSubmitting(false)
      closeAuthModal()
    }
  }, [closeAuthModal, user])

  if (!isAuthModalOpen) {
    return null
  }

  const handleAuthSubmit = async () => {
    setIsSubmitting(true)
    setAuthError(null)
    const normalizedUsername = username.trim().toLowerCase()
    const action: (usernameValue: string, passwordValue: string) => Promise<AuthResult> =
      authModalMode === 'register' ? register : login
    const result = await action(normalizedUsername, password)

    if (!result.ok) {
      setAuthError(result.error)
    } else {
      setUsername('')
      setPassword('')
    }

    setIsSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onClick={closeAuthModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-md border border-[var(--border-strong)] bg-[var(--surface-strong)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <h3 id="auth-modal-title" className="text-base font-semibold text-[var(--text-strong)]">
            {t.labels.authRequiredTitle}
          </h3>
          <button
            type="button"
            onClick={closeAuthModal}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text)] transition hover:text-[var(--text-strong)]"
            aria-label={t.labels.close}
          >
            <Icon name="close" className="text-[20px] leading-none" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-[var(--text-muted)]">
            {t.labels.authRequiredMessage}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthModalMode('login')}
              className={`px-3 py-2 text-sm font-semibold ${authModalMode === 'login' ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]' : 'bg-[var(--surface-soft)] text-[var(--text)]'}`}
            >
              {t.labels.login}
            </button>
            <button
              type="button"
              onClick={() => setAuthModalMode('register')}
              className={`px-3 py-2 text-sm font-semibold ${authModalMode === 'register' ? 'bg-[var(--accent-muted)] text-[var(--accent-text)]' : 'bg-[var(--surface-soft)] text-[var(--text)]'}`}
            >
              {t.labels.register}
            </button>
          </div>

          <div className="grid gap-3">
            <input
              type="text"
              autoComplete="username"
              placeholder={t.labels.username}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
            <input
              type="password"
              autoComplete={authModalMode === 'register' ? 'new-password' : 'current-password'}
              placeholder={t.labels.password}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
            <button
              type="button"
              disabled={isLoading || isSubmitting || !username.trim() || !password}
              onClick={() => {
                void handleAuthSubmit()
              }}
              className="bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-50"
            >
              {authModalMode === 'register' ? t.labels.createAccount : t.labels.signIn}
            </button>
            {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
