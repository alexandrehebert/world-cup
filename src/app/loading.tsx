import { getActiveCompetitionLoaderIconAsset } from '../lib/competition-branding'

export default function Loading() {
  const loaderIconAsset = getActiveCompetitionLoaderIconAsset()

  return (
    <div
      aria-label="Loading"
      role="status"
      className="loader-overlay-motion fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'var(--page-bg)', color: 'var(--accent-text)' }}
    >
      <div className="loader-icon-motion">
        <img src={loaderIconAsset} alt="" aria-hidden="true" className="h-[120px] w-[120px] animate-spin" />
      </div>
    </div>
  )
}
