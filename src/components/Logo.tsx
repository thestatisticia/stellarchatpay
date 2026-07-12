interface LogoProps {
  showText?: boolean;
}

export function Logo({ showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="logo-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
          <path
            d="M4 6h16M4 12h10M4 18h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="18" cy="17" r="3.5" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      </div>
      {showText && (
        <div className="min-w-0 leading-none">
          <p className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            StellarChat
            <span style={{ color: "var(--brand-accent)" }}>Pay</span>
          </p>
          <p className="logo-tagline mt-1">Testnet payments</p>
        </div>
      )}
    </div>
  );
}
