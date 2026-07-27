import type { AnalyticsEvent } from "./analytics";
import { getSupabase, isSupabaseConfigured } from "./supabase";

const PUBLIC_EVENTS = new Set<AnalyticsEvent>([
  "wallet_connect",
  "wallet_disconnect",
  "wallet_connect_error",
  "command_help",
  "command_balance",
  "command_fund",
  "command_send",
  "command_swap",
  "command_escrow",
  "command_activity",
  "command_trust",
  "tx_success",
  "tx_error",
  "feedback_opened",
  "feedback_submitted",
  "onboarding_complete",
  "page_view",
]);

export type PublicPulseEvent = {
  id: string;
  event: string;
  at: string;
};

export type PublicAppStats = {
  connects: number;
  disconnects: number;
  sends: number;
  swaps: number;
  escrows: number;
  funds: number;
  txSuccess: number;
  txErrors: number;
  pageViews: number;
  onboardingComplete: number;
  uniqueWallets: number;
  totalActions: number;
  pulse: PublicPulseEvent[];
  source: "supabase" | "unavailable";
};

function emptyStats(): PublicAppStats {
  return {
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
}

/** Short irreversible fingerprint — never store raw G… addresses publicly. */
export async function hashWalletAddress(address: string): Promise<string> {
  const bytes = new TextEncoder().encode(address.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

/** Fire-and-forget anonymous product event (no wallet / amounts). */
export function publishPublicEvent(event: AnalyticsEvent): void {
  if (!PUBLIC_EVENTS.has(event) || !isSupabaseConfigured) return;
  const supabase = getSupabase();
  if (!supabase) return;

  void supabase.from("app_events").insert({ event }).then(({ error }) => {
    if (error && import.meta.env.DEV) {
      console.warn("[publicStats] event insert failed", error.message);
    }
  });
}

/** Register a pseudonymous wallet for unique-user counting. */
export function registerPublicWallet(address: string): void {
  if (!isSupabaseConfigured || !address) return;
  const supabase = getSupabase();
  if (!supabase) return;

  void (async () => {
    try {
      const wallet_hash = await hashWalletAddress(address);
      const { error } = await supabase.from("app_wallets").upsert(
        { wallet_hash },
        { onConflict: "wallet_hash", ignoreDuplicates: true }
      );
      if (error && import.meta.env.DEV) {
        console.warn("[publicStats] wallet upsert failed", error.message);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[publicStats] wallet hash failed", err);
      }
    }
  })();
}

export async function fetchPublicAppStats(pulseLimit = 20): Promise<PublicAppStats> {
  const supabase = getSupabase();
  if (!supabase) return emptyStats();

  const [eventsRes, walletsRes, pulseRes] = await Promise.all([
    supabase.from("app_events").select("event"),
    supabase.from("app_wallets").select("wallet_hash", { count: "exact", head: true }),
    supabase
      .from("app_events")
      .select("id,event,created_at")
      .order("created_at", { ascending: false })
      .limit(pulseLimit),
  ]);

  if (eventsRes.error) {
    if (import.meta.env.DEV) {
      console.warn("[publicStats] fetch failed", eventsRes.error.message);
    }
    return emptyStats();
  }

  const counts: Record<string, number> = {};
  for (const row of eventsRes.data ?? []) {
    const key = row.event as string;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const connects = counts.wallet_connect ?? 0;
  const sends = counts.command_send ?? 0;
  const swaps = counts.command_swap ?? 0;
  const escrows = counts.command_escrow ?? 0;
  const funds = counts.command_fund ?? 0;
  const txSuccess = counts.tx_success ?? 0;
  const txErrors = counts.tx_error ?? 0;

  return {
    connects,
    disconnects: counts.wallet_disconnect ?? 0,
    sends,
    swaps,
    escrows,
    funds,
    txSuccess,
    txErrors,
    pageViews: counts.page_view ?? 0,
    onboardingComplete: counts.onboarding_complete ?? 0,
    uniqueWallets: walletsRes.count ?? 0,
    totalActions: sends + swaps + escrows + funds + txSuccess,
    pulse: (pulseRes.data ?? []).map((row) => ({
      id: row.id as string,
      event: row.event as string,
      at: row.created_at as string,
    })),
    source: "supabase",
  };
}
