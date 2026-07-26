import { useEffect, useMemo } from "react";
import { useLiveMetrics } from "../hooks/useLiveMetrics";
import { trackEvent } from "../lib/analytics";

export function InsightsPage() {
  const metrics = useLiveMetrics();

  useEffect(() => {
    trackEvent("page_view", { page: "insights" });
  }, []);

  const insight = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthRows = metrics.interactions.filter((r) => new Date(r.at) >= monthStart);
    const spent = monthRows
      .filter((r) => r.action === "send" || r.action === "escrow")
      .reduce((sum, r) => sum + (Number.parseFloat(r.amount ?? "0") || 0), 0);

    const receivedApprox = monthRows
      .filter((r) => r.action === "fund")
      .reduce((sum, r) => sum + (Number.parseFloat(r.amount ?? "0") || 0), 0);

    const actionCounts = monthRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.action] = (acc[r.action] ?? 0) + 1;
      return acc;
    }, {});

    const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    const dayCounts = monthRows.reduce<Record<string, number>>((acc, r) => {
      const day = new Date(r.at).toLocaleDateString(undefined, { weekday: "long" });
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});
    const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    const categoryLabel =
      topAction === "send"
        ? "Transfers"
        : topAction === "swap"
          ? "Swaps"
          : topAction === "escrow"
            ? "Escrow"
            : topAction === "fund"
              ? "Funding"
              : topAction;

    return {
      spent,
      receivedApprox,
      categoryLabel,
      mostActiveDay,
      monthActions: monthRows.length,
      connects: metrics.connects,
    };
  }, [metrics]);

  return (
    <div className="metrics-page">
      <header className="metrics-hero">
        <div>
          <p className="metrics-eyebrow">
            <span className="live-dot" aria-hidden />
            Live
          </p>
          <h1>Insights</h1>
          <p className="metrics-sub">A simple read on how you’ve been using Orbit this month.</p>
        </div>
      </header>

      <section className="metrics-grid insights-grid" aria-label="Insights">
        <article className="metric-card metric-card-wide">
          <p className="metric-label">This month · Spent</p>
          <p className="metric-value">{insight.spent.toFixed(2)} <span className="metric-unit">XLM</span></p>
        </article>
        <article className="metric-card metric-card-wide">
          <p className="metric-label">This month · Funded</p>
          <p className="metric-value">
            {insight.receivedApprox > 0 ? insight.receivedApprox.toFixed(0) : "—"}{" "}
            <span className="metric-unit">XLM</span>
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Top activity</p>
          <p className="metric-value metric-value-sm">{insight.categoryLabel}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Most active day</p>
          <p className="metric-value metric-value-sm">{insight.mostActiveDay}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Actions</p>
          <p className="metric-value">{insight.monthActions}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Wallet connects</p>
          <p className="metric-value">{insight.connects}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Feedback score</p>
          <p className="metric-value">
            {metrics.avgRating == null ? "—" : metrics.avgRating.toFixed(1)}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Unique wallets</p>
          <p className="metric-value">{metrics.uniqueWallets}</p>
        </article>
      </section>

      <section className="metrics-panel">
        <h2>Live pulse</h2>
        {metrics.events.length === 0 ? (
          <p className="metrics-empty">Use Chat to generate live product events.</p>
        ) : (
          <ul className="metrics-feed">
            {metrics.events.slice(0, 12).map((event) => (
              <li key={event.id} className="metrics-feed-item">
                <span className="metrics-feed-time">
                  {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="metrics-feed-type">{event.type.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
