import { Link } from "react-router-dom";
import { BotAvatar } from "./BotAvatar";
import { HeaderNav, MobileBottomNav, SettingsNavLink } from "./HeaderNav";
import { ThemeToggle } from "./ThemeToggle";
import { truncateAddress } from "../lib/stellar";

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
  onClearChat?: () => void;
}

function formatBalance(balance: string | null): string {
  if (balance === null) return "—";
  const value = Number.parseFloat(balance);
  if (Number.isNaN(value)) return balance;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h5M20 20v-5h-5M20 9A8 8 0 006.34 6.34M4 15a8 8 0 0013.66 2.66"
      />
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
  onClearChat,
}: WalletHeaderProps) {
  return (
    <>
      <header className="app-header sticky top-0 z-20">
        <div className="header-inner header-inner-grid">
          <div className="header-brand">
            <Link to="/" className="brand-link" aria-label="Orbit home">
              <BotAvatar size="sm" />
              <span className="brand-name">Orbit</span>
            </Link>
          </div>

          <HeaderNav className="header-nav-desktop" />

          <div className="header-actions">
            {onClearChat && (
              <button
                type="button"
                onClick={onClearChat}
                className="header-icon-btn header-clear-chat"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <RefreshIcon />
              </button>
            )}

            <ThemeToggle theme={theme} onSetTheme={onSetTheme} />
            <SettingsNavLink />

            {isConnected && address ? (
              <button
                type="button"
                onClick={onDisconnect}
                className="header-wallet-pill"
                title="Click to disconnect"
              >
                <span className="header-wallet-icon">
                  <WalletIcon />
                </span>
                <span className="header-wallet-address font-mono">
                  {truncateAddress(address, 4)}
                </span>
                <span className="header-wallet-balance tabular-nums">
                  {isLoadingBalance ? (
                    <span className="header-wallet-stat-skeleton" />
                  ) : (
                    <>
                      <span className="header-wallet-balance-value">{formatBalance(balance)}</span>
                      <span className="header-wallet-balance-unit"> XLM</span>
                    </>
                  )}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnect}
                disabled={isConnecting}
                className="header-connect-btn"
              >
                <span className="header-connect-label">
                  {isConnecting ? "Connecting…" : "Connect Wallet"}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
}
