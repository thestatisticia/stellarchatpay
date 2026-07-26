import { useCallback, useEffect, useState } from "react";
import {
  METRICS_EVENT,
  summarizeMetrics,
  type FeedbackEntry,
  type MetricEvent,
  type WalletInteraction,
} from "../lib/metricsStore";

export interface LiveMetrics {
  events: MetricEvent[];
  interactions: WalletInteraction[];
  feedback: FeedbackEntry[];
  connects: number;
  disconnects: number;
  sends: number;
  swaps: number;
  escrows: number;
  txErrors: number;
  feedbackCount: number;
  avgRating: number | null;
  uniqueWallets: number;
  updatedAt: number;
}

function readLive(): LiveMetrics {
  return { ...summarizeMetrics(), updatedAt: Date.now() };
}

/** Subscribe to analytics + feedback changes (same tab + cross-tab). */
export function useLiveMetrics(): LiveMetrics {
  const [metrics, setMetrics] = useState<LiveMetrics>(() => readLive());

  const refresh = useCallback(() => {
    setMetrics(readLive());
  }, []);

  useEffect(() => {
    const onLocal = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key.startsWith("orbit-") ||
        e.key === "orbit-analytics-events" ||
        e.key === "orbit-wallet-interactions" ||
        e.key === "orbit-feedback-entries"
      ) {
        refresh();
      }
    };

    window.addEventListener(METRICS_EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    const poll = window.setInterval(refresh, 2000);

    return () => {
      window.removeEventListener(METRICS_EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
    };
  }, [refresh]);

  return metrics;
}
