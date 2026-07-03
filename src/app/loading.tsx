import { getActiveCompetitionLoaderIconAsset } from '../lib/competition-branding'

export default function Loading() {
  const loaderIconAsset = getActiveCompetitionLoaderIconAsset()

  return (
    <div
      aria-label="Loading"
      role="status"
      className="loader-overlay-motion fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'var(--page-bg)', color: 'var(--logo-accent)' }}
    >
      <div className="loader-icon-motion">
        <span
          aria-hidden="true"
          className="loader-brand-icon block h-[120px] w-[120px] animate-spin"
          style={{
            backgroundColor: 'var(--logo-accent)',
            WebkitMaskImage: `url(${loaderIconAsset})`,
            maskImage: `url(${loaderIconAsset})`,
          }}
        />
      </div>
    </div>
  )
}
