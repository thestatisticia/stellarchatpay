import { NavLink } from "react-router-dom";

const PRIMARY = [
  { to: "/", label: "Chat", end: true },
  { to: "/activity", label: "Activity", end: false },
  { to: "/insights", label: "Insights", end: false },
] as const;

const MOBILE = [
  ...PRIMARY,
  { to: "/settings", label: "Settings", end: false },
] as const;

export function HeaderNav({ className = "" }: { className?: string }) {
  return (
    <nav className={`header-nav ${className}`.trim()} aria-label="Primary">
      {PRIMARY.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h8M8 14h5M21 12a8.5 8.5 0 01-8.5 8.5H8l-4 2.5V12A8.5 8.5 0 0112.5 3.5 8.5 8.5 0 0121 12z"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M9 19v-7M14 19v-4M19 19V8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c0 .7.4 1.3 1 1.5H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
      />
    </svg>
  );
}

const MOBILE_ICONS = {
  "/": ChatIcon,
  "/activity": ActivityIcon,
  "/insights": InsightsIcon,
  "/settings": SettingsIcon,
} as const;

export function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile">
      {MOBILE.map((link) => {
        const Icon = MOBILE_ICONS[link.to];
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? "is-active" : undefined)}
          >
            <Icon />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function SettingsNavLink() {
  return (
    <NavLink
      to="/settings"
      className={({ isActive }) =>
        `header-icon-btn header-settings-link${isActive ? " is-active" : ""}`
      }
      aria-label="Settings"
      title="Settings"
    >
      <SettingsIcon />
    </NavLink>
  );
}
