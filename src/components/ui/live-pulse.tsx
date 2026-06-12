export const LivePulse = ({ className = '' }: { className?: string }) => (
  <span aria-hidden="true" className={`relative inline-flex items-center justify-center ${className}`.trim()}>
    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-text)] opacity-55 animate-ping motion-reduce:animate-none" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-text)]" />
  </span>
)