import { useEffect, useMemo } from "react";
import { trackEvent } from "../lib/analytics";

const STORAGE_KEY = "orbit-onboarding-v1";

export type OnboardingStepId = "connect" | "fund" | "balance" | "send";

interface OnboardingChecklistProps {
  isConnected: boolean;
  completed: Record<OnboardingStepId, boolean>;
  onMark: (step: OnboardingStepId) => void;
  onDismiss: () => void;
  onQuickCommand: (command: string) => void;
  onConnect: () => void;
}

const STEPS: Array<{
  id: OnboardingStepId;
  title: string;
  command?: string;
}> = [
  { id: "connect", title: "Connect wallet" },
  { id: "fund", title: "Fund wallet", command: "fund" },
  { id: "balance", title: "Check balance", command: "balance" },
  { id: "send", title: "Send payment", command: "send 1 to " },
];

export function loadOnboardingState(): {
  dismissed: boolean;
  completed: Record<OnboardingStepId, boolean>;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        dismissed: false,
        completed: { connect: false, fund: false, balance: false, send: false },
      };
    }
    const parsed = JSON.parse(raw) as {
      dismissed?: boolean;
      completed?: Partial<Record<OnboardingStepId, boolean>>;
    };
    return {
      dismissed: Boolean(parsed.dismissed),
      completed: {
        connect: Boolean(parsed.completed?.connect),
        fund: Boolean(parsed.completed?.fund),
        balance: Boolean(parsed.completed?.balance),
        send: Boolean(parsed.completed?.send),
      },
    };
  } catch {
    return {
      dismissed: false,
      completed: { connect: false, fund: false, balance: false, send: false },
    };
  }
}

export function saveOnboardingState(state: {
  dismissed: boolean;
  completed: Record<OnboardingStepId, boolean>;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore.
  }
}

export function getNextOnboardingStep(
  completed: Record<OnboardingStepId, boolean>
): { id: OnboardingStepId; title: string; command?: string } | null {
  return STEPS.find((step) => !completed[step.id]) ?? null;
}

/** Slim sidebar checklist — never competes with chat. */
export function OnboardingChecklist({
  isConnected,
  completed,
  onMark,
  onDismiss,
  onQuickCommand,
  onConnect,
}: OnboardingChecklistProps) {
  const doneCount = useMemo(
    () => STEPS.filter((s) => completed[s.id]).length,
    [completed]
  );
  const allDone = doneCount === STEPS.length;
  const next = getNextOnboardingStep(completed);

  useEffect(() => {
    if (isConnected && !completed.connect) onMark("connect");
  }, [isConnected, completed.connect, onMark]);

  useEffect(() => {
    if (allDone) trackEvent("onboarding_complete");
  }, [allDone]);

  return (
    <aside className="onboarding-sidebar" aria-label="Getting started">
      <div className="onboarding-sidebar-head">
        <p className="onboarding-eyebrow">Getting started</p>
        <button type="button" className="onboarding-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
      <ul className="onboarding-sidebar-steps">
        {STEPS.map((step) => {
          const done = completed[step.id];
          const current = next?.id === step.id;
          return (
            <li
              key={step.id}
              className={[done ? "is-done" : "", current ? "is-current" : ""].filter(Boolean).join(" ") || undefined}
            >
              <button
                type="button"
                className="onboarding-sidebar-step"
                disabled={done || (step.id !== "connect" && !isConnected)}
                onClick={() => {
                  if (step.id === "connect") {
                    onConnect();
                    return;
                  }
                  if (step.command) {
                    trackEvent("onboarding_step", { step: step.id });
                    onQuickCommand(step.command);
                  }
                }}
              >
                <span className="onboarding-check" aria-hidden>
                  {done ? "✓" : ""}
                </span>
                <span>{step.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
