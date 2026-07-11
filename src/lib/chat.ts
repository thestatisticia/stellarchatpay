export type MessageRole = "user" | "bot" | "system";

export type MessageStatus = "info" | "success" | "error" | "pending";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  txHash?: string;
  explorerUrl?: string;
  amount?: string;
  destination?: string;
}

export interface ParsedSendCommand {
  amount: string;
  destination: string;
}

const SEND_PATTERNS = [
  /^(?:send|pay|transfer)\s+(\d+(?:\.\d+)?)\s*(?:xlm)?\s+(?:to\s+)?(G[A-Z2-7]{55})$/i,
  /^(?:send|pay|transfer)\s+(\d+(?:\.\d+)?)\s+to\s+(G[A-Z2-7]{55})$/i,
  /^(\d+(?:\.\d+)?)\s*xlm\s+(?:to\s+)?(G[A-Z2-7]{55})$/i,
];

export const QUICK_COMMANDS = [
  { label: "Balance", command: "balance", icon: "💰" },
  { label: "Fund account", command: "fund", icon: "🚰" },
  { label: "Help", command: "help", icon: "❓" },
] as const;

const BALANCE_PATTERNS = [
  /^balance\s+(?:of\s+)?(G[A-Z2-7]{55})$/i,
  /^check\s+(?:balance\s+)?(?:of\s+)?(G[A-Z2-7]{55})$/i,
  /^lookup\s+(G[A-Z2-7]{55})$/i,
];

const FUND_PATTERNS = [
  /^fund\s+(?:wallet\s+)?(G[A-Z2-7]{55})$/i,
  /^fund\s+(?:account\s+)?(G[A-Z2-7]{55})$/i,
];

export function parseFundCommand(input: string): string | null {
  const trimmed = input.trim();
  for (const pattern of FUND_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function parseBalanceCommand(input: string): string | null {
  const trimmed = input.trim();
  for (const pattern of BALANCE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export function parseSendCommand(input: string): ParsedSendCommand | null {
  const trimmed = input.trim();
  for (const pattern of SEND_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return { amount: match[1], destination: match[2] };
    }
  }
  return null;
}

export function createMessage(
  partial: Omit<ChatMessage, "id" | "timestamp">
): ChatMessage {
  return {
    ...partial,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  };
}

export const WELCOME_MESSAGE = `Hey — I'm your Stellar payment assistant on **testnet**.

Tap a quick action below or type a command:

• \`balance\` — check your XLM
• \`balance G...\` — check any wallet's balance
• \`fund\` — fund your wallet via Friendbot
• \`fund G...\` — fund any testnet wallet
• \`send 10 to G...\` — pay someone

Payments open in Freighter for you to approve.`;

export const HELP_MESSAGE = `**Commands**

\`balance\` — your XLM balance
\`balance G...\` — balance of any testnet address
\`check G...\` — alias for balance lookup
\`fund\` — Friendbot funding for your wallet
\`fund G...\` — Friendbot funding for any address
\`send <amount> to <address>\` — send a payment

**Also works:**
• \`pay 5 G...\`
• \`transfer 2 XLM to G...\`
• \`10 xlm to G...\`

**Tip:** Stellar addresses always start with \`G\` and are 56 characters long.`;
