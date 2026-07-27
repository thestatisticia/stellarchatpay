import { useCallback, useEffect, useState } from "react";
import { fetchPublicAppStats, type PublicAppStats } from "../lib/publicStats";
import { METRICS_EVENT } from "../lib/metricsStore";

const EMPTY: PublicAppStats = {
  connects: 0,
  disconnects: 0,
  sends: 0,
  swaps: 0,
  escrows: 0,
  funds: 0,
  txSuccess: 0,
  txErrors: 0,
  pageViews: 0,
  onboardingComplete: 0,
  uniqueWallets: 0,
  totalActions: 0,
  pulse: [],
  source: "unavailable",
};

export function usePublicStats(pollMs = 10000) {
  const [stats, setStats] = useState<PublicAppStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchPublicAppStats();
      setStats(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onLocal = () => void refresh();
    window.addEventListener(METRICS_EVENT, onLocal);
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => {
      window.removeEventListener(METRICS_EVENT, onLocal);
      window.clearInterval(id);
    };
  }, [refresh, pollMs]);

  return { stats, loading, refresh };
}
