import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'

export const Footer = () => {
  const { t } = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-8 border-t border-[var(--border)] py-6 text-center">
      <p className="inline-flex items-center justify-center gap-1.5 text-sm text-[var(--text-muted)]">
        <span>{t.footer.madeWithLove}</span>
        <Icon name="favorite" className="text-[16px] text-red-500" />
        <span>{t.footer.byAxoon}</span>
      </p>
      <p className="mt-2 text-xs text-[var(--text-soft)]">
        {`Copyright © ${year} Axoon. ${t.footer.rightsReserved}`}
      </p>
    </footer>
  )
}
