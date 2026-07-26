import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trackEvent } from "../lib/analytics";
import { useTheme } from "../hooks/useTheme";
import { useWallet } from "../hooks/useWallet";
import { FeedbackModal } from "../components/FeedbackModal";
import { truncateAddress } from "../lib/stellar";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const wallet = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    trackEvent("page_view", { page: "settings" });
  }, []);

  useEffect(() => {
    if (searchParams.get("feedback") === "1") {
      setFeedbackOpen(true);
      trackEvent("feedback_opened", { source: "footer" });
      searchParams.delete("feedback");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="metrics-page">
      <header className="metrics-hero">
        <div>
          <p className="metrics-eyebrow">Preferences</p>
          <h1>Settings</h1>
          <p className="metrics-sub">Theme, wallet, and support — kept out of the chat chrome.</p>
        </div>
      </header>

      <section className="settings-list">
        <div className="settings-row">
          <div>
            <p className="settings-label">Theme</p>
            <p className="settings-hint">Light or dark for Orbit.</p>
          </div>
          <div className="settings-theme-btns">
            <button
              type="button"
              className={theme === "light" ? "is-active" : undefined}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={theme === "dark" ? "is-active" : undefined}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <p className="settings-label">Connected wallet</p>
            <p className="settings-hint font-mono">
              {wallet.address ? truncateAddress(wallet.address, 6) : "Not connected"}
            </p>
          </div>
          {wallet.isConnected ? (
            <button type="button" className="modal-secondary" onClick={() => void wallet.disconnect()}>
              Disconnect
            </button>
          ) : (
            <button type="button" className="header-connect-btn" onClick={() => void wallet.connect()}>
              Connect
            </button>
          )}
        </div>

        <div className="settings-row">
          <div>
            <p className="settings-label">Network</p>
            <p className="settings-hint">Stellar Testnet</p>
          </div>
          <span className="settings-badge">Testnet</span>
        </div>

        <div className="settings-row">
          <div>
            <p className="settings-label">Feedback</p>
            <p className="settings-hint">Tell us what to improve.</p>
          </div>
          <button
            type="button"
            className="modal-secondary"
            onClick={() => {
              trackEvent("feedback_opened", { source: "settings" });
              setFeedbackOpen(true);
            }}
          >
            Send feedback
          </button>
        </div>

        <div className="settings-row">
          <div>
            <p className="settings-label">Back to chat</p>
            <p className="settings-hint">Return to the main conversation.</p>
          </div>
          <Link to="/" className="text-link">
            Open Chat
          </Link>
        </div>
      </section>

      <FeedbackModal
        open={feedbackOpen}
        walletAddress={wallet.address}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}
