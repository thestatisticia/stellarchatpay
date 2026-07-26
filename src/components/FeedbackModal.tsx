import { useState, type FormEvent } from "react";
import { trackEvent } from "../lib/analytics";
import { submitFeedback } from "../lib/feedback";

interface FeedbackModalProps {
  open: boolean;
  walletAddress: string | null;
  onClose: () => void;
}

export function FeedbackModal({ open, walletAddress, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const result = await submitFeedback({
      rating,
      comment,
      wallet: walletAddress,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    trackEvent("feedback_submitted", { rating });
    setDone(true);
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <h2 id="feedback-title">Thanks for the feedback</h2>
            <p className="modal-copy">Your input helps shape Orbit for Level 4 and beyond.</p>
            <button type="button" className="header-connect-btn" onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="feedback-title">How is Orbit working for you?</h2>
            <p className="modal-copy">Quick rating + optional note. Takes under a minute.</p>

            <div className="feedback-stars" role="group" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={rating >= n ? "is-active" : undefined}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>

            <label className="feedback-label" htmlFor="feedback-comment">
              What should we improve?
            </label>
            <textarea
              id="feedback-comment"
              className="feedback-textarea"
              rows={3}
              maxLength={500}
              placeholder="Optional — onboarding, payments, escrow, mobile…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            {error && <p className="feedback-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="modal-secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="header-connect-btn" disabled={busy || rating < 1}>
                {busy ? "Sending…" : "Submit feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
