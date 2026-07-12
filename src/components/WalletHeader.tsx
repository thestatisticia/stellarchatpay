import { truncateAddress } from "../lib/stellar";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface WalletHeaderProps {
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  isLoadingBalance: boolean;
  isConnected: boolean;
  theme: "light" | "dark";
  onSetTheme: (theme: "light" | "dark") => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

function formatBalance(balance: string | null): string {
  if (balance === null) return "—";
  const value = Number.parseFloat(balance);
  if (Number.isNaN(value)) return balance;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-9z"
      />
      <path strokeLinecap="round" d="M16 12.5h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18" />
    </svg>
  );
}

export function WalletHeader({
  address,
  balance,
  isConnecting,
  isLoadingBalance,
  isConnected,
  theme,
  onSetTheme,
  onConnect,
  onDisconnect,
}: WalletHeaderProps) {
  return (
    <header className="app-header sticky top-0 z-20">
      <div className="header-inner">
        <Logo />

        <div className="header-actions">
          {isConnected && address && (
            <div className="header-wallet-stat hidden sm:flex">
              <span className="header-wallet-stat-icon">
                <WalletIcon />
              </span>
              <span className="header-wallet-stat-text tabular-nums">
                {isLoadingBalance ? (
                  <span className="header-wallet-stat-skeleton" />
                ) : (
                  <>
                    <strong>{formatBalance(balance)} XLM</strong>
                    <span className="header-wallet-stat-sep">·</span>
                    <span className="font-mono">{truncateAddress(address, 4)}</span>
                  </>
                )}
              </span>
            </div>
          )}

          <ThemeToggle theme={theme} onSetTheme={onSetTheme} />

          {isConnected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="header-ghost-btn hidden sm:inline-flex"
            >
              Disconnect
            </button>
          ) : null}

          {!isConnected && (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="header-connect-btn"
            >
              <WalletIcon />
              <span>{isConnecting ? "Connecting…" : "Connect Wallet"}</span>
            </button>
          )}
        </div>
      </div>

      {isConnected && address && (
        <div className="header-mobile-bar sm:hidden">
          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
            {truncateAddress(address, 4)}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
              {isLoadingBalance ? "…" : `${formatBalance(balance)} XLM`}
            </span>
            <button type="button" onClick={onDisconnect} className="header-ghost-btn text-xs">
              Disconnect
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
