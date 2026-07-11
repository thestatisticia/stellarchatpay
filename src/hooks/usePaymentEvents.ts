import { useEffect, useRef } from "react";
import { fetchRecentPaymentEvents, type PaymentEvent } from "../lib/contract";
import { isContractConfigured } from "../config/contract";

export function usePaymentEvents(
  enabled: boolean,
  onNewEvent: (event: PaymentEvent) => void
) {
  const seenIds = useRef(new Set<string>());
  const cursor = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !isContractConfigured()) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const { events, latestLedger } = await fetchRecentPaymentEvents(
          cursor.current
        );
        if (cancelled) return;

        cursor.current = latestLedger;

        for (const event of events) {
          if (seenIds.current.has(event.id)) continue;
          seenIds.current.add(event.id);
          onNewEvent(event);
        }
      } catch {
        // RPC unavailable — retry on next interval
      }
    };

    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, onNewEvent]);
}
