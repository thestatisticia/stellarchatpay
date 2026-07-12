interface SuggestionLinksProps {
  disabled: boolean;
  onSelect: (command: string) => void;
  variant?: "hero" | "compact";
}

const SUGGESTIONS = [
  { label: "Check my XLM balance", command: "balance" },
  { label: "Send a testnet payment", command: "send 10 to G..." },
  { label: "Swap XLM to USDC on the DEX", command: "swap 10 xlm to usdc" },
  { label: "What commands can I use?", command: "help" },
  { label: "Show on-chain activity", command: "activity" },
];

export function SuggestionLinks({ disabled, onSelect, variant = "hero" }: SuggestionLinksProps) {
  return (
    <ul className={variant === "hero" ? "suggestion-list" : "suggestion-list-compact"}>
      {SUGGESTIONS.map((item) => (
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
