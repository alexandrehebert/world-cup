import type { ReactNode } from 'react'
import { materialSymbolsRounded } from '../app/fonts'

export const Icon = ({ name, className = '', children }: { name: string; className?: string; children?: ReactNode }) => (
  <span aria-hidden="true" className={`${materialSymbolsRounded.className} material-symbols-rounded ${className}`.trim()}>
    {children ?? name}
  </span>
)
