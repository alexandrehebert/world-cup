import type { ReactNode } from 'react'

type ModalMatchSection<Item> = {
  key: string
  title: string
  items: readonly Item[]
  renderItem: (item: Item) => ReactNode
  tone?: 'default' | 'live'
  titlePrefix?: ReactNode
  alwaysRender?: boolean
  emptyMessage?: string
}

interface ModalMatchSectionsProps<Item> {
  sections: readonly ModalMatchSection<Item>[]
}

export const ModalMatchSections = <Item,>({ sections }: ModalMatchSectionsProps<Item>) => {
  const visibleSections = sections.filter((section) => section.alwaysRender || section.items.length > 0)

  if (visibleSections.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {visibleSections.map((section) => (
        <div key={section.key}>
          <p
            className={`mb-2 text-xs font-semibold uppercase tracking-[0.22em] ${
              section.tone === 'live' ? 'flex items-center gap-1.5 text-[var(--accent-text)]' : 'text-[var(--text-soft)]'
            }`}
          >
            {section.titlePrefix}
            {section.title}
          </p>
          {section.items.length > 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-sm)] divide-y divide-[var(--border)] border border-[var(--border)]">
              {section.items.map(section.renderItem)}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">{section.emptyMessage}</p>
          )}
        </div>
      ))}
    </div>
  )
}
