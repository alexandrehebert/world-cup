import type { ReactNode } from 'react'

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-[var(--surface)] ${className}`.trim()}>
    {children}
  </div>
)
