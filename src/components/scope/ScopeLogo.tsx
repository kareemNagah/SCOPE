export function ScopeLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <defs>
          <linearGradient id="scope-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--scope-purple)" />
            <stop offset=".5" stopColor="var(--scope-violet)" />
            <stop offset="1" stopColor="var(--scope-blue)" />
          </linearGradient>
        </defs>
        <path
          d="M24 4H10C7 4 5 6 5 8.5C5 11 7 12.5 10 13L18 14.5C21 15 23 16.5 23 19.5C23 22 21 24 18 24H4"
          stroke="url(#scope-grad)" strokeWidth="4" strokeLinecap="square"
        />
      </svg>
      <span className="font-sans text-[15px] font-semibold tracking-[0.18em] text-foreground">
        SCOPE
      </span>
    </div>
  );
}
