import { useEffect, useMemo } from "react";
import { WalletPrivacyGate } from "../components/WalletPrivacyGate";
import { useLiveMetrics } from "../hooks/useLiveMetrics";
import { useWallet } from "../hooks/useWallet";
import { trackEvent } from "../lib/analytics";
import { truncateAddress } from "../lib/stellar";
import type { WalletInteraction } from "../lib/metricsStore";

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function describe(row: WalletInteraction) {
  const amount = row.amount ? ` ${row.amount} XLM` : "";
  switch (row.action) {
    case "send":
      return `Sent${amount}`;
    case "fund":
      return "Funded wallet via Friendbot";
    case "swap":
      return `Swapped${amount || " assets"}`;
    case "escrow":
      return `Escrow${amount}`;
    default:
      return `${row.action}${amount}`;
  }
}

function PrivateActivity() {
  const wallet = useWallet();
  const metrics = useLiveMetrics();
  const address = wallet.address!;

  useEffect(() => {
    trackEvent("page_view", { page: "activity" });
  }, []);

  const personal = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const myInteractions = metrics.interactions.filter((r) => r.address === address);
    const monthRows = myInteractions.filter((r) => new Date(r.at) >= monthStart);

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

    const connects = metrics.events.filter((e) => {
      if (e.type !== "wallet_connect") return false;
      const eventAddress = e.props?.address;
      return typeof eventAddress !== "string" || eventAddress === address;
    }).length;

    return {
      spent,
      receivedApprox,
      categoryLabel,
      mostActiveDay,
      monthActions: monthRows.length,
      connects,
      interactions: myInteractions,
    };
  }, [address, metrics.interactions, metrics.events]);

  const groups = useMemo(() => {
    const map = new Map<string, WalletInteraction[]>();
    for (const row of personal.interactions) {
      const label = dayLabel(row.at);
      const list = map.get(label) ?? [];
      list.push(row);
      map.set(label, list);
    }
    return Array.from(map.entries());
  }, [personal.interactions]);

  return (
    <div className="metrics-page activity-page">
      <header className="metrics-hero">
        <div>
          <p className="metrics-eyebrow">Private · this wallet</p>
          <h1>Activity</h1>
          <p className="metrics-sub">
            Your spending and history for {truncateAddress(address, 5)} — on this device only, never
            shown on public Insights.
          </p>
        </div>
      </header>

      <section className="metrics-grid insights-grid" aria-label="Private wallet stats">
        <article className="metric-card metric-card-wide">
          <p className="metric-label">This month · Spent</p>
          <p className="metric-value">
            {personal.spent.toFixed(2)} <span className="metric-unit">XLM</span>
          </p>
        </article>
        <article className="metric-card metric-card-wide">
          <p className="metric-label">This month · Funded</p>
          <p className="metric-value">
            {personal.receivedApprox > 0 ? personal.receivedApprox.toFixed(0) : "—"}{" "}
            <span className="metric-unit">XLM</span>
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Top activity</p>
          <p className="metric-value metric-value-sm">{personal.categoryLabel}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Most active day</p>
          <p className="metric-value metric-value-sm">{personal.mostActiveDay}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Actions</p>
          <p className="metric-value">{personal.monthActions}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Wallet connects</p>
          <p className="metric-value">{personal.connects}</p>
        </article>
      </section>

      <section className="metrics-panel">
        <h2>History</h2>
        {groups.length === 0 ? (
          <p className="metrics-empty">
            No activity yet. Try <code className="code-inline">send</code>,{" "}
            <code className="code-inline">swap</code>, or <code className="code-inline">escrow</code>{" "}
            in Chat.
          </p>
        ) : (
          <div className="activity-groups">
            {groups.map(([label, rows]) => (
              <section key={label} className="activity-group">
                <h2>{label}</h2>
                <ul>
                  {rows.map((row, i) => (
                    <li key={`${row.at}-${i}`}>
                      <div>
                        <p className="activity-title">{describe(row)}</p>
                        <p className="activity-meta">
                          {new Date(row.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {row.explorerUrl ? (
                        <a
                          className="text-link"
                          href={row.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ActivityPage() {
  return (
    <WalletPrivacyGate
      title="Activity"
      description="Your private wallet stats and history. Public product stats live on Insights."
    >
      <PrivateActivity />
    </WalletPrivacyGate>
  );
}
