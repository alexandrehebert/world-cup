import { useNavigate } from 'react-router-dom'
import { useLocale } from '../contexts/locale-context'

export const NotFoundPage = () => {
  const { t } = useLocale()
  const navigate = useNavigate()

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{t.labels.pageNotFoundTitle}</h2>
      <div className="space-y-4 bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">
        <p>{t.labels.pageNotFoundMessage}</p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center justify-center border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
        >
          {t.labels.goToDashboard}
        </button>
      </div>
    </section>
  )
}
