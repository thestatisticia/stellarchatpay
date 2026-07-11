import { truncateAddress } from "../lib/stellar";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface WalletHeaderProps {
  address: string | null;
  balance: string | null;
  walletName: string | null;
  isConnecting: boolean;
  isLoadingBalance: boolean;
  isConnected: boolean;
  theme: "light" | "dark";
  onSetTheme: (theme: "light" | "dark") => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletHeader({
  address,
  walletName,
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
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <div
            className="hidden items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:flex"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-muted)",
              background: "var(--surface-2)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isConnected ? "var(--success)" : "var(--text-faint)" }}
            />
            Testnet
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle theme={theme} onSetTheme={onSetTheme} />

          {isConnected && address && (
            <div className="wallet-pill hidden rounded-lg px-3 py-1.5 text-right md:block">
              {walletName && (
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                  {walletName}
                </p>
              )}
              <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                {truncateAddress(address, 6)}
              </p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                {isLoadingBalance ? (
                  <span
                    className="inline-block h-4 w-14 animate-pulse rounded"
                    style={{ background: "var(--surface-3)" }}
                  />
                ) : (
                  `${balance ?? "0"} XLM`
                )}
              </p>
            </div>
          )}

          {isConnected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="btn-ghost btn-ghost-danger rounded-lg px-3 py-2 text-xs font-medium sm:text-sm"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-primary rounded-lg px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>

      {isConnected && address && (
        <div className="border-t px-4 py-2 md:hidden" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto flex max-w-3xl items-center justify-between text-sm">
            <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              {truncateAddress(address, 6)}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: "var(--text)" }}>
              {isLoadingBalance ? "…" : `${balance ?? "0"} XLM`}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
