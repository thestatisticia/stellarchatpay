export type WalletErrorCode =
  | "WALLET_NOT_FOUND"
  | "USER_REJECTED"
  | "INSUFFICIENT_BALANCE";

export class AppWalletError extends Error {
  code: WalletErrorCode;

  constructor(code: WalletErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AppWalletError";
  }
}

export function formatWalletError(error: unknown): string {
  if (error instanceof AppWalletError) {
    return error.message;
  }
  if (error instanceof Error) {
    return parseRawMessage(error.message);
  }
  return "Something went wrong. Please try again.";
}

function parseRawMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("wallet not found") ||
    lower.includes("not installed") ||
    lower.includes("no wallet") ||
    lower.includes("could not detect")
  ) {
    return "No Stellar wallet detected. Install Freighter, xBull, or Albedo and try again.";
  }

  if (
    lower.includes("user declined") ||
    lower.includes("user rejected") ||
    lower.includes("rejected") ||
    lower.includes("denied") ||
    lower.includes("cancel")
  ) {
    return "You rejected the request in your wallet. Nothing was sent.";
  }

  if (lower.includes("wallet selection cancelled")) {
    return "Wallet connection cancelled.";
  }

  if (
    lower.includes("underfunded") ||
    lower.includes("insufficient") ||
    lower.includes("not enough") ||
    lower.includes("op_underfunded")
  ) {
    return "Insufficient XLM balance to complete this transaction (include ~0.00001 XLM for fees).";
  }

  return message;
}

export function classifyAndThrow(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("wallet not found") ||
    lower.includes("not installed") ||
    lower.includes("no wallet")
  ) {
    throw new AppWalletError(
      "WALLET_NOT_FOUND",
      "No Stellar wallet detected. Install Freighter, xBull, or Albedo and try again."
    );
  }

  if (
    lower.includes("user declined") ||
    lower.includes("user rejected") ||
    lower.includes("rejected") ||
    lower.includes("denied") ||
    lower.includes("cancel")
  ) {
    throw new AppWalletError(
      "USER_REJECTED",
      "You rejected the request in your wallet. Nothing was sent."
    );
  }

  if (
    lower.includes("underfunded") ||
    lower.includes("insufficient") ||
    lower.includes("op_underfunded")
  ) {
    throw new AppWalletError(
      "INSUFFICIENT_BALANCE",
      "Insufficient XLM balance for this payment and network fee."
    );
  }

  if (error instanceof Error) throw error;
  throw new Error(message);
}

export async function assertSufficientBalance(
  address: string,
  amount: string,
  fetchBalance: (address: string) => Promise<string>,
  assetLabel = "XLM"
): Promise<void> {
  const balance = parseFloat(await fetchBalance(address));
  const needed = parseFloat(amount) + (assetLabel === "XLM" ? 0.00001 : 0);
  if (Number.isNaN(balance) || balance < needed) {
    throw new AppWalletError(
      "INSUFFICIENT_BALANCE",
      `Insufficient ${assetLabel} balance. You have ${balance} ${assetLabel} but need at least ${needed.toFixed(assetLabel === "USDC" ? 2 : 5)} ${assetLabel}.`
    );
  }
}
