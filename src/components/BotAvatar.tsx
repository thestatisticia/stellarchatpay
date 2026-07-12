export function BotAvatar() {
  return (
    <div className="bot-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 10.5c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v.75c0 .55-.25 1.07-.68 1.42l-1.32 1.1a1.5 1.5 0 00-.5 1.12V15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
        <path
          d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
