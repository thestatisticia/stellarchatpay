import {
  getLocalFeedback as readFeedback,
  notifyMetricsChanged,
  persistFeedback,
  type FeedbackEntry,
} from "./metricsStore";

export type { FeedbackEntry };

const FEEDBACK_DONE_KEY = "orbit-feedback-submitted";

export function hasSubmittedFeedback(): boolean {
  try {
    return localStorage.getItem(FEEDBACK_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getLocalFeedback(): FeedbackEntry[] {
  return readFeedback();
}

function saveLocal(entry: FeedbackEntry) {
  const prev = readFeedback();
  persistFeedback([entry, ...prev].slice(0, 50));
  try {
    localStorage.setItem(FEEDBACK_DONE_KEY, "1");
  } catch {
    // Ignore.
  }
  notifyMetricsChanged();
}

/**
 * Submit feedback to optional Formspree / webhook endpoint, and always keep a local copy.
 * Set VITE_FEEDBACK_ENDPOINT to a Formspree URL (https://formspree.io/f/xxxx) or similar POST endpoint.
 */
export async function submitFeedback(input: {
  rating: number;
  comment: string;
  wallet?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const entry: FeedbackEntry = {
    rating: input.rating,
    comment: input.comment.trim(),
    wallet: input.wallet ?? null,
    at: new Date().toISOString(),
  };

  if (entry.rating < 1 || entry.rating > 5) {
    return { ok: false, error: "Pick a rating from 1 to 5." };
  }

  const endpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT?.trim();

  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          rating: entry.rating,
          comment: entry.comment || "(no comment)",
          wallet: entry.wallet ?? "anonymous",
          product: "Orbit",
          at: entry.at,
        }),
      });

      if (!res.ok) {
        return { ok: false, error: `Feedback endpoint returned ${res.status}.` };
      }
    } catch {
      return { ok: false, error: "Could not reach the feedback endpoint. Try again." };
    }
  }

  saveLocal(entry);
  return { ok: true };
}
