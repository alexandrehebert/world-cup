import type { ReactNode } from 'react'

export const Icon = ({ name, className = '', children }: { name: string; className?: string; children?: ReactNode }) => (
  <span aria-hidden="true" className={`material-symbols-rounded ${className}`.trim()}>
    {children ?? name}
  </span>
)
