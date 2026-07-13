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

/** Wallets like xBull throw plain `{ code, message }` objects — not Error instances. */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof AppWalletError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message !== "[object Object]") {
      return record.message;
    }
    if (record.error && typeof record.error === "object") {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string") return nested.message;
    }
  }

  return "Something went wrong. Please try again.";
}

export function formatWalletError(error: unknown): string {
  return parseRawMessage(extractErrorMessage(error));
}

function parseRawMessage(message: string): string {
  const lower = message.toLowerCase();

  if (message === "[object Object]") {
    return "You rejected the request in your wallet. Nothing was sent.";
  }

  if (
    lower.includes("wallet not found") ||
    lower.includes("not installed") ||
    lower.includes("no wallet") ||
    lower.includes("could not detect") ||
    lower.includes("download it from") ||
    lower.includes("freighter is not connected")
  ) {
    if (message.toLowerCase().includes("download it from")) {
      return message;
    }
    return "Wallet not found. Install Freighter, Albedo, or xBull first, then try Connect again.";
  }

  if (
    lower.includes("user declined") ||
    lower.includes("user rejected") ||
    lower.includes("rejected") ||
    lower.includes("denied") ||
    lower.includes("cancel") ||
    lower.includes("closed") ||
    lower.includes("abort")
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

  if (
    lower.includes("op_no_destination") ||
    lower.includes("no_destination") ||
    lower.includes("destination account does not exist")
  ) {
    return "Recipient not found on testnet. Check the full 56-character address — wrong or incomplete keys won't work.";
  }

  if (
    lower.includes("invalid field") ||
    lower.includes("malformed") ||
    lower.includes("invalid account id")
  ) {
    return "Invalid Stellar address. Public keys are 56 characters and start with `G` — copy the full address from your wallet.";
  }

  return message;
}

export function classifyAndThrow(error: unknown): never {
  const message = extractErrorMessage(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("wallet not found") ||
    lower.includes("not installed") ||
    lower.includes("no wallet") ||
    lower.includes("download it from") ||
    lower.includes("freighter is not connected")
  ) {
    throw new AppWalletError(
      "WALLET_NOT_FOUND",
      message.toLowerCase().includes("download it from")
        ? message
        : "Wallet not found. Install Freighter, Albedo, or xBull first, then try Connect again."
    );
  }

  if (
    lower.includes("user declined") ||
    lower.includes("user rejected") ||
    lower.includes("rejected") ||
    lower.includes("denied") ||
    lower.includes("cancel") ||
    lower.includes("closed") ||
    lower.includes("abort") ||
    message === "[object Object]"
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
