interface QuickActionsProps {
  disabled: boolean;
  onSelect: (command: string) => void;
}

export function QuickActions({ disabled, onSelect }: QuickActionsProps) {
  const actions = [
    { label: "Balance", command: "balance" },
    { label: "Fund", command: "fund" },
    { label: "Swap", command: "swap 10 xlm to usdc" },
    { label: "Activity", command: "activity" },
    { label: "Help", command: "help" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.command}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(action.command)}
          className="chip rounded-md px-3 py-1.5 text-xs font-medium"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
