import { useEffect } from "react";
import { usePublicStats } from "../hooks/usePublicStats";
import { useRemoteFeedback } from "../hooks/useRemoteFeedback";
import { trackEvent } from "../lib/analytics";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function topActionLabel(stats: {
  sends: number;
  swaps: number;
  escrows: number;
  funds: number;
}) {
  const ranked: [string, number][] = [
    ["Transfers", stats.sends],
    ["Swaps", stats.swaps],
    ["Escrow", stats.escrows],
    ["Funding", stats.funds],
  ];
  const top = ranked.sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] === 0) return "—";
  return top[0];
}

export function InsightsPage() {
  const { stats, loading: statsLoading } = usePublicStats();
  const feedback = useRemoteFeedback();

  useEffect(() => {
    trackEvent("page_view", { page: "insights" });
  }, []);

  const publicScore = feedback.avgRating;
  const topActivity = topActionLabel(stats);

  return (
    <div className="metrics-page">
      <header className="metrics-hero">
        <div>
          <p className="metrics-eyebrow">
            <span className="live-dot" aria-hidden />
            Live · public
          </p>
          <h1>Insights</h1>
          <p className="metrics-sub">
            Orbit product metrics shared with everyone — usage, wallets, and anonymous feedback.
            Personal balances live on Activity.
          </p>
        </div>
      </header>

      {stats.source === "unavailable" && !statsLoading && (
        <p className="metrics-panel-note insights-setup-note">
          Shared stats need the public tables. Run{" "}
          <code className="code-inline">docs/supabase-public-stats.sql</code> in the Supabase SQL
          Editor, then refresh.
        </p>
      )}

      <section className="metrics-grid insights-grid" aria-label="Public product insights">
        <article className="metric-card metric-card-wide">
          <p className="metric-label">Unique wallets</p>
          <p className="metric-value">{stats.uniqueWallets}</p>
        </article>
        <article className="metric-card metric-card-wide">
          <p className="metric-label">Wallet connects</p>
          <p className="metric-value">{stats.connects}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Total actions</p>
          <p className="metric-value">{stats.totalActions}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Top activity</p>
          <p className="metric-value metric-value-sm">{topActivity}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Sends</p>
          <p className="metric-value">{stats.sends}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Swaps</p>
          <p className="metric-value">{stats.swaps}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Escrows</p>
          <p className="metric-value">{stats.escrows}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Funds</p>
          <p className="metric-value">{stats.funds}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Successful txs</p>
          <p className="metric-value">{stats.txSuccess}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Tx errors</p>
          <p className="metric-value">{stats.txErrors}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Feedback score</p>
          <p className="metric-value">{publicScore == null ? "—" : publicScore.toFixed(1)}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Feedback responses</p>
          <p className="metric-value">{feedback.entries.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Page views</p>
          <p className="metric-value">{stats.pageViews}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Onboarding done</p>
          <p className="metric-value">{stats.onboardingComplete}</p>
        </article>
      </section>

      <div className="metrics-columns">
        <section className="metrics-panel">
          <h2>
            Live pulse
            <span className="feedback-source-tag">App-wide</span>
          </h2>
          {statsLoading ? (
            <p className="metrics-empty">Loading live events…</p>
          ) : stats.pulse.length === 0 ? (
            <p className="metrics-empty">
              No shared events yet. Connect wallets and use Chat — activity appears here for
              everyone.
            </p>
          ) : (
            <ul className="metrics-feed">
              {stats.pulse.map((event) => (
                <li key={event.id} className="metrics-feed-item">
                  <span className="metrics-feed-time">
                    {new Date(event.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="metrics-feed-type">{event.event.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="metrics-panel">
          <h2>
            Product feedback
            <span className="feedback-source-tag">Anonymous</span>
          </h2>
          {feedback.loading ? (
            <p className="metrics-empty">Loading feedback…</p>
          ) : feedback.entries.length === 0 ? (
            <p className="metrics-empty">
              No feedback yet. Submit from Settings or after a successful payment.
              {feedback.error ? ` (${feedback.error})` : ""}
            </p>
          ) : (
            <ul className="feedback-live-list">
              {feedback.entries.map((entry, i) => (
                <li key={`${entry.at}-${i}`} className="feedback-live-item">
                  <div className="feedback-live-top">
                    <span className="feedback-live-stars">{"★".repeat(entry.rating)}</span>
                    <span className="feedback-live-when">{formatWhen(entry.at)}</span>
                  </div>
                  <p className="feedback-live-comment">
                    {entry.comment || <em>No comment</em>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
