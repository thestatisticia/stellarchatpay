interface ThemeToggleProps {
  theme: "light" | "dark";
  onSetTheme: (theme: "light" | "dark") => void;
}

export function ThemeToggle({ theme, onSetTheme }: ThemeToggleProps) {
  return (
    <div className="theme-segment" role="group" aria-label="Theme">
      <button
        type="button"
        onClick={() => onSetTheme("light")}
        aria-pressed={theme === "light"}
        className={`theme-segment-btn ${theme === "light" ? "is-active" : ""}`}
        title="Light theme"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        type="button"
        onClick={() => onSetTheme("dark")}
        aria-pressed={theme === "dark"}
        className={`theme-segment-btn ${theme === "dark" ? "is-active" : ""}`}
        title="Dark theme"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
          />
        </svg>
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}
