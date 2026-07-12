interface BotAvatarProps {
  size?: "sm" | "md";
}

export function BotAvatar({ size = "md" }: BotAvatarProps) {
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <div
      className={`bot-avatar flex ${dim} shrink-0 items-center justify-center rounded-full`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={icon} fill="none">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
        <path
          d="M12 3.5l2.2 6.8h7.1l-5.7 4.2 2.2 6.8L12 17l-5.8 4.3 2.2-6.8-5.7-4.2h7.1L12 3.5z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
