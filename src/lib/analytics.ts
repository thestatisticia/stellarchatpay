import { track } from "@vercel/analytics";
import {
  appendMetricEvent,
  getWalletInteractions as readInteractions,
  persistWalletInteractions,
  type WalletInteraction,
} from "./metricsStore";
import { publishPublicEvent, registerPublicWallet } from "./publicStats";

export type AnalyticsEvent =
  | "wallet_connect"
  | "wallet_disconnect"
  | "wallet_connect_error"
  | "command_help"
  | "command_balance"
  | "command_fund"
  | "command_send"
  | "command_swap"
  | "command_escrow"
  | "command_activity"
  | "command_trust"
  | "tx_success"
  | "tx_error"
  | "feedback_opened"
  | "feedback_submitted"
  | "onboarding_step"
  | "onboarding_complete"
  | "page_view";

export type { WalletInteraction };

const MAX_LOCAL_INTERACTIONS = 100;

function safeTrack(event: AnalyticsEvent, props?: Record<string, string | number | boolean>) {
  try {
    // Never send wallet addresses to Vercel analytics.
    const { address: _address, ...safeProps } = props ?? {};
    void _address;
    track(event, Object.keys(safeProps).length ? safeProps : undefined);
  } catch {
    // Analytics must never break the app.
  }

  appendMetricEvent(event, props);
  publishPublicEvent(event);

  if (event === "wallet_connect" && typeof props?.address === "string") {
    registerPublicWallet(props.address);
  }

  if (import.meta.env.DEV) {
    console.debug("[analytics]", event, props ?? {});
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
) {
  safeTrack(event, props);
}

export function recordWalletInteraction(entry: Omit<WalletInteraction, "at">) {
  const row: WalletInteraction = { ...entry, at: new Date().toISOString() };
  const prev = readInteractions();
  persistWalletInteractions([row, ...prev].slice(0, MAX_LOCAL_INTERACTIONS));

  trackEvent("tx_success", {
    action: entry.action,
    hasTx: Boolean(entry.txHash),
    address: entry.address,
  });
}

export function getWalletInteractions(): WalletInteraction[] {
  return readInteractions();
}
