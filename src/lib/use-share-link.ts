import { useEffect, useState } from 'react'

export const useShareLink = (path: string, durationMs = 2000) => {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsCopied(false)
    }, durationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [durationMs, isCopied])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setIsCopied(true)
    } catch (error) {
      console.error(`Unable to copy shared link for path "${path}"`, error)
      setIsCopied(false)
    }
  }

  return { isCopied, share }
}
