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
  /** Soroban log_payment tx (shown with payment in one card). */
  contractTxHash?: string;
  contractExplorerUrl?: string;
  amount?: string;
  destination?: string;
}

export interface ParsedSendCommand {
  amount: string;
  destination: string;
}

export interface ParsedSwapCommand {
  amount: string;
  from: "xlm" | "usdc";
  to: "xlm" | "usdc";
}

export type ParsedEscrowCommand =
  | { action: "create"; amount: string; destination: string }
  | { action: "release"; id: number }
  | { action: "refund"; id: number }
  | { action: "status"; id: number };

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

const SWAP_PATTERNS = [
  /^swap\s+(\d+(?:\.\d+)?)\s+(xlm|usdc)\s+(?:to|for|into)\s+(xlm|usdc)$/i,
  /^exchange\s+(\d+(?:\.\d+)?)\s+(xlm|usdc)\s+(?:to|for|into)\s+(xlm|usdc)$/i,
];

const TRUST_PATTERNS = [/^trust\s+usdc$/i, /^add\s+usdc\s+trustline$/i];

const CONFIRM_PATTERNS = [/^confirm(?:\s+swap)?$/i, /^yes$/i];

const ESCROW_CREATE_PATTERNS = [
  /^escrow(?:\s+create)?\s+(\d+(?:\.\d+)?)\s*(?:xlm)?\s+(?:to|for)\s+(G[A-Z2-7]{55})$/i,
  /^lock\s+(\d+(?:\.\d+)?)\s*(?:xlm)?\s+(?:to|for)\s+(G[A-Z2-7]{55})$/i,
  /^lock\s+(\d+(?:\.\d+)?)\s*(?:xlm)?\s+in\s+(?:the\s+)?escrow\s+(?:to|for)\s+(G[A-Z2-7]{55})$/i,
];

const ESCROW_RELEASE_PATTERNS = [/^escrow\s+release\s+(\d+)$/i, /^release\s+escrow\s+(\d+)$/i];
const ESCROW_REFUND_PATTERNS = [/^escrow\s+refund\s+(\d+)$/i, /^refund\s+escrow\s+(\d+)$/i];
const ESCROW_STATUS_PATTERNS = [
  /^escrow\s+(?:status|get|show)\s+(\d+)$/i,
  /^escrow\s+(\d+)$/i,
];

export function parseConfirmCommand(input: string): boolean {
  return CONFIRM_PATTERNS.some((pattern) => pattern.test(input.trim()));
}

export function parseTrustCommand(input: string): boolean {
  return TRUST_PATTERNS.some((pattern) => pattern.test(input.trim()));
}

export function parseSwapCommand(input: string): ParsedSwapCommand | null {
  const trimmed = input.trim();
  for (const pattern of SWAP_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const from = match[2].toLowerCase() as "xlm" | "usdc";
      const to = match[3].toLowerCase() as "xlm" | "usdc";
      if (from === to) return null;
      return { amount: match[1], from, to };
    }
  }
  return null;
}

export function parseEscrowCommand(input: string): ParsedEscrowCommand | null {
  const trimmed = input.trim();

  for (const pattern of ESCROW_CREATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return { action: "create", amount: match[1], destination: match[2] };
    }
  }
  for (const pattern of ESCROW_RELEASE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return { action: "release", id: Number(match[1]) };
  }
  for (const pattern of ESCROW_REFUND_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return { action: "refund", id: Number(match[1]) };
  }
  for (const pattern of ESCROW_STATUS_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return { action: "status", id: Number(match[1]) };
  }
  return null;
}

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

const SEND_LIKE_PREFIX =
  /^(?:send|pay|transfer|\d+(?:\.\d+)?\s*xlm)\b/i;

const SWAP_LIKE_PREFIX = /^(?:swap|exchange)\s+/i;

const ESCROW_LIKE_PREFIX =
  /^(?:escrow|lock|release\s+escrow|refund\s+escrow)\b|\bin\s+(?:the\s+)?escrow\b/i;

function extractAddressCandidate(input: string): string | null {
  const match = input.match(/\b(G[A-Z2-7]+)/i);
  return match ? match[1].toUpperCase() : null;
}

/** Helpful message when input looks like a send command but does not parse. */
export function explainSendCommandFailure(input: string): string | null {
  const trimmed = input.trim();
  if (!SEND_LIKE_PREFIX.test(trimmed)) return null;
  if (parseSendCommand(trimmed)) return null;

  const address = extractAddressCandidate(trimmed);

  if (!address) {
    return "Missing recipient address.\n\nUse a full Stellar public key (56 characters, starts with `G`):\n`send 10 to GABCDEF...`\n`send 10 xlm to GABCDEF...`";
  }

  if (trimmed.includes("...") || trimmed.endsWith("..")) {
    return "Address looks truncated — don't use `...`. Paste the **full** 56-character Stellar address from your wallet.";
  }

  if (address.length < 56) {
    return `Address is incomplete (**${address.length}/56** characters).\n\nStellar public keys must be copied in full. Example:\n\`send 10 to GABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345\``;
  }

  if (address.length > 56) {
    return "Address is too long. A Stellar public key is exactly **56 characters** (including the leading `G`).";
  }

  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return "Invalid address characters. After `G`, use only **A–Z** and **2–7** (Stellar base32).";
  }

  return "Couldn't parse that send command.\n\nTry:\n`send 10 to G...`\n`send 10 xlm to G...`\n\nBoth need the full recipient address.";
}

/** Helpful message when input looks like a swap command but does not parse. */
export function explainSwapCommandFailure(input: string): string | null {
  const trimmed = input.trim();
  if (!SWAP_LIKE_PREFIX.test(trimmed)) return null;
  if (parseSwapCommand(trimmed)) return null;

  return "Couldn't parse that swap.\n\nUse:\n`swap 10 xlm to usdc`\n`swap 1 usdc to xlm`";
}

/** Helpful message when input looks like an escrow command but does not parse. */
export function explainEscrowCommandFailure(input: string): string | null {
  const trimmed = input.trim();
  if (!ESCROW_LIKE_PREFIX.test(trimmed)) return null;
  if (parseEscrowCommand(trimmed)) return null;

  const address = extractAddressCandidate(trimmed);
  const looksLikeCreate =
    /^(?:escrow(?:\s+create)?|lock)\s+\d/i.test(trimmed) ||
    /\block\s+\d/i.test(trimmed);

  if (looksLikeCreate && (trimmed.includes("...") || trimmed.endsWith(".."))) {
    return "Address looks truncated — don't use `...`. Paste the **full** 56-character Stellar address from your wallet.\n\nExample:\n`escrow 10 to GABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345`";
  }

  if (looksLikeCreate && !address) {
    return "Escrow needs a **recipient address** — who gets the funds when you release.\n\nTry:\n`escrow 10 to GABCDEF...` (full 56-character address)\n`lock 100 xlm to GABCDEF...`\n\n`lock 100 xlm in the escrow` alone isn't enough without **to G...**.";
  }

  if (address) {
    if (trimmed.includes("...") || trimmed.endsWith("..")) {
      return "Address looks truncated — don't use `...`. Paste the **full** 56-character Stellar address from your wallet.";
    }

    if (address.length < 56) {
      return `Address is incomplete (**${address.length}/56** characters).\n\nEscrow example:\n\`escrow 10 to GABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345\``;
    }

    if (address.length > 56) {
      return "Address is too long. A Stellar public key is exactly **56 characters** (including the leading `G`).";
    }

    if (!/^G[A-Z2-7]{55}$/.test(address)) {
      return "Invalid address characters. After `G`, use only **A–Z** and **2–7** (Stellar base32).";
    }
  }

  if (/^escrow\s+(?:release|refund|status)\b/i.test(trimmed) && !/\d/.test(trimmed)) {
    return "Missing escrow ID.\n\nTry:\n`escrow release 1`\n`escrow refund 1`\n`escrow status 1`";
  }

  return "Couldn't parse that escrow command.\n\n**Create** (lock XLM for someone):\n`escrow 10 to G...` — use the full address, not literally `G...`\n`lock 100 xlm to G...`\n\n**After creating:**\n`escrow release 1` · `escrow refund 1` · `escrow status 1`";
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
• \`activity\` — live payment feed from the Soroban contract
• \`swap 10 xlm to usdc\` — get a quote, then type \`confirm\`
• \`send 10 to G...\` — pay someone (logged on-chain)
• \`escrow 10 to G...\` — lock XLM, then \`escrow release <id>\`

Connect via **Freighter, Albedo, or xBull** using the wallet picker.`;

export const HELP_MESSAGE = `**Commands**

\`balance\` — your XLM balance
\`balance usdc\` — your USDC balance on testnet
\`balance G...\` — balance of any testnet address
\`check G...\` — alias for balance lookup
\`fund\` — Friendbot funding for your wallet
\`fund G...\` — Friendbot funding for any address
\`swap 10 xlm to usdc\` — quote from the DEX, then \`confirm\`
\`swap 1 usdc to xlm\` — swap USDC → XLM (quote + confirm)
\`trust usdc\` — manually add USDC trustline (optional; first USDC swap adds it automatically)
\`confirm\` — approve a pending swap quote
\`activity\` — recent payments from the on-chain activity feed
\`send <amount> to <address>\` — send a payment (also logged to contract)
\`escrow <amount> to <address>\` — lock XLM in the escrow contract
\`escrow release <id>\` — release escrow to recipient (calls payment-log)
\`escrow refund <id>\` — refund escrow to sender
\`escrow status <id>\` — show escrow details

**Also works:**
• \`pay 5 G...\`
• \`transfer 2 XLM to G...\`
• \`10 xlm to G...\`
• \`exchange 5 usdc to xlm\`
• \`lock 10 to G...\`

**Tip:** Stellar addresses always start with \`G\` and are 56 characters long.`;
