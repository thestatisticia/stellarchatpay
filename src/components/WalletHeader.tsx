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
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="network-badge hidden sm:inline-flex">
            <span
              className="network-dot"
              style={{ background: isConnected ? "var(--success)" : "var(--text-faint)" }}
            />
            Testnet
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle theme={theme} onSetTheme={onSetTheme} />

          {isConnected && address ? (
            <>
              <div className="wallet-chip">
                <span className="wallet-chip-address font-mono">
                  {truncateAddress(address, 4)}
                </span>
                <span className="wallet-chip-divider" aria-hidden />
                <span className="wallet-chip-balance tabular-nums">
                  {isLoadingBalance ? (
                    <span className="wallet-chip-skeleton" />
                  ) : (
                    <>
                      {formatBalance(balance)}
                      <span className="wallet-chip-unit">XLM</span>
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={onDisconnect}
                className="btn-ghost rounded-md px-3 py-1.5 text-xs font-medium"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-primary rounded-md px-3.5 py-1.5 text-xs font-medium sm:text-sm"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
