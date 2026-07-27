import { Link } from "react-router-dom";
import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { formatWalletError } from "../lib/errors";

interface WalletPrivacyGateProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/** Personal wallet data stays on-device and only for the connected address. */
export function WalletPrivacyGate({ title, description, children }: WalletPrivacyGateProps) {
  const wallet = useWallet();
  const [connectError, setConnectError] = useState<string | null>(null);

  if (wallet.isConnected && wallet.address) {
    return <>{children}</>;
  }

  const handleConnect = async () => {
    setConnectError(null);
    wallet.clearError();
    try {
      await wallet.connect();
    } catch (error) {
      setConnectError(formatWalletError(error));
    }
  };

  return (
    <div className="metrics-page">
      <header className="metrics-hero">
        <div>
          <p className="metrics-eyebrow">Private</p>
          <h1>{title}</h1>
          <p className="metrics-sub">{description}</p>
        </div>
      </header>
      <section className="metrics-panel privacy-gate-panel">
        <p className="metrics-empty">
          Connect to see your private spent, funded, and history. Public product stats for judges
          and visitors stay on Insights — no wallet required.
        </p>
        <div className="privacy-gate-actions">
          <button
            type="button"
            className="header-connect-btn"
            disabled={wallet.isConnecting}
            onClick={() => void handleConnect()}
          >
            {wallet.isConnecting ? "Connecting…" : "Connect wallet"}
          </button>
          <Link to="/insights" className="text-link">
            View public Insights
          </Link>
        </div>
        {(connectError || wallet.error) && (
          <p className="feedback-error" role="alert">
            {connectError || wallet.error}
          </p>
        )}
      </section>
    </div>
  );
}
