interface SuggestionLinksProps {
  disabled: boolean;
  onSelect: (command: string) => void;
  variant?: "hero" | "compact" | "chips" | "examples";
  /** Chip key to emphasize: fund | balance | send | swap | escrow */
  highlightKey?: string | null;
}

const CHIPS = [
  { key: "fund", label: "Fund wallet", command: "fund" },
  { key: "balance", label: "Check balance", command: "balance" },
  { key: "send", label: "Send XLM", command: "send 10 to G..." },
  { key: "swap", label: "Swap assets", command: "swap 10 xlm to usdc" },
  { key: "escrow", label: "Create escrow", command: "escrow 10 to G..." },
];

const EXAMPLES = [
  {
    label: "Swap 10 XLM to USDC",
    command: "swap 10 xlm to usdc",
  },
  {
    label: "Lock 10 XLM in escrow",
    command: "escrow 10 to G...",
  },
  {
    label: "Show my recent activity",
    command: "activity",
  },
];

const LIST = [
  { label: "Check balance", command: "balance" },
  { label: "Send XLM", command: "send 10 to G..." },
  { label: "Swap assets", command: "swap 10 xlm to usdc" },
  { label: "Create escrow", command: "escrow 10 to G..." },
];

export function SuggestionLinks({
  disabled,
  onSelect,
  variant = "chips",
  highlightKey = null,
}: SuggestionLinksProps) {
  if (variant === "examples") {
    return (
      <ul className="example-prompts">
        {EXAMPLES.map((item) => (
          <li key={item.command}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.command)}
              className="example-prompt"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (variant === "chips") {
    return (
      <ul className="suggestion-chips">
        {CHIPS.map((item) => {
          const highlighted = highlightKey === item.key;
          return (
            <li key={item.command}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(item.command)}
                className={`suggestion-chip${highlighted ? " is-highlight" : ""}`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className={variant === "hero" ? "suggestion-list" : "suggestion-list-compact"}>
      {LIST.map((item) => (
        <li key={item.command}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.command)}
            className="suggestion-link"
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
