import {
  getLocalFeedback as readFeedback,
  notifyMetricsChanged,
  persistFeedback,
  type FeedbackEntry,
} from "./metricsStore";
import { getSupabase, isSupabaseConfigured, type FeedbackRow } from "./supabase";

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

function rowToEntry(row: FeedbackRow): FeedbackEntry {
  return {
    rating: row.rating,
    comment: row.comment ?? "",
    wallet: null,
    at: row.created_at,
  };
}

/** Latest feedback from Supabase (shared across all users). Falls back to local. */
export async function fetchFeedback(limit = 40): Promise<FeedbackEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return getLocalFeedback();

  const { data, error } = await supabase
    .from("feedback")
    .select("id,rating,comment,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("[feedback] fetch failed, using local", error?.message);
    return getLocalFeedback();
  }

  return (data as FeedbackRow[]).map(rowToEntry);
}

/**
 * Submit feedback to Supabase when configured; always keeps a local copy.
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

  if (isSupabaseConfigured) {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    // Never publish wallet addresses — feedback is anonymous product input only.
    const { error } = await supabase.from("feedback").insert({
      rating: entry.rating,
      comment: entry.comment || "",
      wallet: null,
    });

    if (error) {
      return {
        ok: false,
        error:
          error.message.includes("relation") || error.code === "42P01"
            ? "Feedback table missing. Run docs/supabase-feedback.sql in Supabase SQL Editor."
            : `Could not save feedback: ${error.message}`,
      };
    }

    saveLocal(entry);
    return { ok: true };
  }

  // Optional Formspree fallback
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
