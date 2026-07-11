import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

const server = new Horizon.Server(HORIZON_URL);

export type SignTransactionFn = (
  xdr: string,
  address: string
) => Promise<string>;

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getExplorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function getAccountExplorerUrl(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}

export async function fetchAccountBalance(publicKey: string): Promise<{
  balance: string;
  exists: boolean;
}> {
  try {
    const account = await server.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    return { balance: native?.balance ?? "0", exists: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      return { balance: "0", exists: false };
    }
    throw error;
  }
}

export async function fetchXlmBalance(publicKey: string): Promise<string> {
  const { balance } = await fetchAccountBalance(publicKey);
  return balance;
}

export async function fundTestnetAccount(publicKey: string): Promise<{
  status: "funded" | "already_funded";
  message: string;
}> {
  const response = await fetch(
    `${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`
  );

  if (response.ok) {
    return {
      status: "funded",
      message: "Account funded with testnet XLM from Friendbot.",
    };
  }

  let detail = "";
  try {
    const data = (await response.json()) as { detail?: string; title?: string };
    detail = data.detail ?? data.title ?? "";
  } catch {
    detail = await response.text();
  }

  const normalized = detail.toLowerCase();

  if (
    normalized.includes("already funded") ||
    normalized.includes("starting balance")
  ) {
    return {
      status: "already_funded",
      message:
        "This account already has testnet XLM. Friendbot only funds new accounts once.",
    };
  }

  if (response.status === 400) {
    throw new Error(
      detail || "Friendbot rejected the request. Check the Stellar address."
    );
  }

  if (response.status >= 500) {
    throw new Error("Friendbot is temporarily unavailable. Try again in a moment.");
  }

  throw new Error(detail || "Friendbot funding failed");
}

export interface SendPaymentResult {
  hash: string;
  explorerUrl: string;
}

export async function sendXlmPayment(
  sourcePublicKey: string,
  destination: string,
  amount: string,
  signTransaction: SignTransactionFn
): Promise<SendPaymentResult> {
  const account = await server.loadAccount(sourcePublicKey);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build();

  const signedXdr = await signTransaction(transaction.toXDR(), sourcePublicKey);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const response = await server.submitTransaction(signedTx);

  return {
    hash: response.hash,
    explorerUrl: getExplorerUrl(response.hash),
  };
}

export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}
