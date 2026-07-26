/** Shared realtime metrics bus for Analytics + Feedback pages. */

export const METRICS_EVENT = "orbit-metrics";
export const ANALYTICS_EVENTS_KEY = "orbit-analytics-events";
export const INTERACTIONS_KEY = "orbit-wallet-interactions";
export const FEEDBACK_KEY = "orbit-feedback-entries";

const MAX_EVENTS = 200;

export interface MetricEvent {
  id: string;
  type: string;
  props?: Record<string, string | number | boolean>;
  at: string;
}

export interface WalletInteraction {
  address: string;
  action: string;
  amount?: string;
  txHash?: string;
  explorerUrl?: string;
  at: string;
}

export interface FeedbackEntry {
  rating: number;
  comment: string;
  wallet?: string | null;
  at: string;
}

function emitMetricsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(METRICS_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getMetricEvents(): MetricEvent[] {
  return readJson<MetricEvent[]>(ANALYTICS_EVENTS_KEY, []);
}

export function getWalletInteractions(): WalletInteraction[] {
  return readJson<WalletInteraction[]>(INTERACTIONS_KEY, []);
}

export function getLocalFeedback(): FeedbackEntry[] {
  return readJson<FeedbackEntry[]>(FEEDBACK_KEY, []);
}

export function appendMetricEvent(
  type: string,
  props?: Record<string, string | number | boolean>
) {
  const row: MetricEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    props,
    at: new Date().toISOString(),
  };

  try {
    const prev = getMetricEvents();
    localStorage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify([row, ...prev].slice(0, MAX_EVENTS)));
  } catch {
    // Ignore storage failures.
  }

  emitMetricsChanged();
}

export function persistWalletInteractions(rows: WalletInteraction[]) {
  try {
    localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(rows));
  } catch {
    // Ignore.
  }
  emitMetricsChanged();
}

export function persistFeedback(rows: FeedbackEntry[]) {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(rows));
  } catch {
    // Ignore.
  }
  emitMetricsChanged();
}

export function notifyMetricsChanged() {
  emitMetricsChanged();
}

export function summarizeMetrics() {
  const events = getMetricEvents();
  const interactions = getWalletInteractions();
  const feedback = getLocalFeedback();

  const count = (type: string) => events.filter((e) => e.type === type).length;

  const uniqueWallets = new Set(
    interactions.map((i) => i.address).filter(Boolean)
  ).size;

  const avgRating =
    feedback.length === 0
      ? null
      : feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

  return {
    events,
    interactions,
    feedback,
    connects: count("wallet_connect"),
    disconnects: count("wallet_disconnect"),
    sends: count("command_send"),
    swaps: count("command_swap"),
    escrows: count("command_escrow"),
    txErrors: count("tx_error"),
    feedbackCount: feedback.length,
    avgRating,
    uniqueWallets,
  };
}
