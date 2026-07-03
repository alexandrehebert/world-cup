'use client'

import { useEffect, useRef, useState } from 'react'

const STARTUP_LOADER_MIN_VISIBLE_MS = 520
const STARTUP_LOADER_EXIT_MS = 320
const STARTUP_READY_TIMEOUT_MS = 4500
const FLAG_STYLES_TIMEOUT_MS = 2800
const FLAG_IMAGE_TIMEOUT_MS = 2200

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const withTimeout = async (promise: Promise<unknown>, timeoutMs: number) => {
  await Promise.race([promise, wait(timeoutMs)])
}

const waitForFlagStylesAndAsset = async () => {
  const probe = document.createElement('span')
  probe.className = 'fi fi-us'
  probe.setAttribute('aria-hidden', 'true')
  probe.style.position = 'fixed'
  probe.style.left = '-9999px'
  probe.style.top = '-9999px'
  document.body.appendChild(probe)

  try {
    const startedAt = getNow()
    let backgroundImage = ''

    while (getNow() - startedAt < FLAG_STYLES_TIMEOUT_MS) {
      backgroundImage = window.getComputedStyle(probe).backgroundImage
      if (backgroundImage && backgroundImage !== 'none' && backgroundImage.includes('url(')) {
        break
      }
      await wait(50)
    }

    const imageUrlMatch = backgroundImage.match(/url\((['"]?)(.+?)\1\)/)
    const imageUrl = imageUrlMatch?.[2]
    if (!imageUrl) {
      return
    }

    await withTimeout(
      new Promise<void>((resolve) => {
        const image = new Image()
        image.onload = () => resolve()
        image.onerror = () => resolve()
        image.src = imageUrl
      }),
      FLAG_IMAGE_TIMEOUT_MS,
    )
  } finally {
    probe.remove()
  }
}

export const StartupLoader = ({ loaderIconAsset }: { loaderIconAsset: string }) => {
  const shownAtRef = useRef(getNow())
  const [isVisible, setIsVisible] = useState(true)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    let isCancelled = false
    let removeTimeoutId: number | undefined

    void withTimeout(
      (async () => {
        await Promise.all([
          document.fonts ? document.fonts.ready : Promise.resolve(),
          waitForFlagStylesAndAsset(),
        ])
      })(),
      STARTUP_READY_TIMEOUT_MS,
    ).then(async () => {
      const elapsedMs = getNow() - shownAtRef.current
      const remainingMs = Math.max(0, STARTUP_LOADER_MIN_VISIBLE_MS - elapsedMs)
      if (remainingMs > 0) {
        await wait(remainingMs)
      }

      if (isCancelled) {
        return
      }

      setIsVisible(false)
      removeTimeoutId = window.setTimeout(() => {
        if (!isCancelled) {
          setIsMounted(false)
        }
      }, STARTUP_LOADER_EXIT_MS)
    })

    return () => {
      isCancelled = true
      if (removeTimeoutId !== undefined) {
        window.clearTimeout(removeTimeoutId)
      }
    }
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div
      aria-label="Loading"
      role="status"
      className={`startup-loader fixed inset-0 z-[9999] flex items-center justify-center ${
        isVisible ? 'startup-loader--visible' : 'startup-loader--hidden'
      }`}
      style={{ background: 'var(--page-bg)', color: 'var(--accent-text)' }}
    >
      <div className="loader-icon-motion">
        <img src={loaderIconAsset} alt="" aria-hidden="true" className="h-[120px] w-[120px] animate-spin" />
      </div>
    </div>
  )
}
