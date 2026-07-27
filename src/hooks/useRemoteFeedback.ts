import { useCallback, useEffect, useState } from "react";
import { fetchFeedback } from "../lib/feedback";
import type { FeedbackEntry } from "../lib/metricsStore";
import { METRICS_EVENT } from "../lib/metricsStore";
import { isSupabaseConfigured } from "../lib/supabase";

export function useRemoteFeedback(pollMs = 8000) {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchFeedback(40);
      setEntries(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
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

  const avgRating =
    entries.length === 0
      ? null
      : entries.reduce((sum, e) => sum + e.rating, 0) / entries.length;

  return {
    entries,
    loading,
    error,
    avgRating,
    refresh,
    source: isSupabaseConfigured ? ("supabase" as const) : ("local" as const),
  };
}
