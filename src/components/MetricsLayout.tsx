import { Outlet } from "react-router-dom";
import { AppFooter } from "./AppFooter";
import { WalletHeader } from "./WalletHeader";
import { useTheme } from "../hooks/useTheme";
import { useWallet } from "../hooks/useWallet";

/** Shared chrome for Activity / Insights / Settings. */
export function MetricsLayout() {
  const wallet = useWallet();
  const { theme, setTheme } = useTheme();

  const handleConnect = () => {
    wallet.clearError();
    void wallet.connect().catch(() => {
      // Error is stored on wallet.state and shown below.
    });
  };

  return (
    <div className="app-shell app-shell-scroll">
      <WalletHeader
        address={wallet.address}
        balance={wallet.balance}
        isConnecting={wallet.isConnecting}
        isLoadingBalance={wallet.isLoadingBalance}
        isConnected={wallet.isConnected}
        theme={theme}
        onSetTheme={setTheme}
        onConnect={handleConnect}
        onDisconnect={() => void wallet.disconnect()}
      />
      {wallet.error && !wallet.isConnected && (
        <div className="wallet-banner-error" role="alert">
          <p>{wallet.error}</p>
          <button type="button" className="text-link" onClick={() => wallet.clearError()}>
            Dismiss
          </button>
        </div>
      )}
      <main className="metrics-main">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}

