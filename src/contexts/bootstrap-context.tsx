/* eslint-disable react-refresh/only-export-components */
'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ClientBootstrapData } from '../types/bootstrap'

const BootstrapContext = createContext<ClientBootstrapData | null>(null)

export const BootstrapProvider = ({
  value,
  children,
}: {
  value: ClientBootstrapData | null
  children: ReactNode
}) => {
  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>
}

export const useBootstrapData = () => useContext(BootstrapContext)
