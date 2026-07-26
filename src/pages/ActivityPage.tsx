import { useEffect, useMemo } from "react";
import { trackEvent } from "../lib/analytics";
import { useLiveMetrics } from "../hooks/useLiveMetrics";
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
  const who = truncateAddress(row.address, 4);
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
      return `${row.action}${amount} · ${who}`;
  }
}

export function ActivityPage() {
  const metrics = useLiveMetrics();

  useEffect(() => {
    trackEvent("page_view", { page: "activity" });
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, WalletInteraction[]>();
    for (const row of metrics.interactions) {
      const label = dayLabel(row.at);
      const list = map.get(label) ?? [];
      list.push(row);
      map.set(label, list);
    }
    return Array.from(map.entries());
  }, [metrics.interactions]);

  return (
    <div className="metrics-page activity-page">
      <header className="metrics-hero">
        <div>
          <p className="metrics-eyebrow">History</p>
          <h1>Activity</h1>
          <p className="metrics-sub">Your Orbit actions, grouped like a conversation timeline.</p>
        </div>
      </header>

      {groups.length === 0 ? (
        <section className="metrics-panel">
          <p className="metrics-empty">
            No activity yet. Connect in Chat and try <code className="code-inline">send</code>,{" "}
            <code className="code-inline">swap</code>, or <code className="code-inline">escrow</code>.
          </p>
        </section>
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
                      <p className="activity-meta font-mono">{truncateAddress(row.address, 5)}</p>
                    </div>
                    {row.explorerUrl ? (
                      <a className="text-link" href={row.explorerUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      <span className="activity-time">
                        {new Date(row.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
