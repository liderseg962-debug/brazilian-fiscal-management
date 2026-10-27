export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#1f5fbf" />
        <path d="M9 23V9l14 14V9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23" cy="9" r="2.2" fill="#7fb2ff" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight">
        Nexo <span className="font-normal opacity-70">Fiscal</span>
      </span>
    </span>
  )
}
