import { Outlet } from "react-router-dom";
import { AppFooter } from "./AppFooter";
import { WalletHeader } from "./WalletHeader";
import { useTheme } from "../hooks/useTheme";
import { useWallet } from "../hooks/useWallet";

/** Shared chrome for Activity / Insights / Settings. */
export function MetricsLayout() {
  const wallet = useWallet();
  const { theme, setTheme } = useTheme();

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
        onConnect={() => void wallet.connect()}
        onDisconnect={() => void wallet.disconnect()}
      />
      <main className="metrics-main">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
