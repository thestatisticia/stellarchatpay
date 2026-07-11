interface LogoProps {
  size?: "sm" | "md";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-lg";
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`logo-mark ${box} flex shrink-0 items-center justify-center`}
        aria-hidden
      >
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
        <div className="min-w-0">
          <p className={`${text} font-semibold tracking-tight`} style={{ color: "var(--text)" }}>
            StellarChat
            <span className="font-normal" style={{ color: "var(--text-muted)" }}>
              {" "}
              Pay
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
