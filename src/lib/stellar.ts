import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
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

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getExplorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export async function checkFreighterInstalled(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const installed = await checkFreighterInstalled();
  if (!installed) {
    throw new Error(
      "Freighter wallet not found. Install it from https://www.freighter.app"
    );
  }

  const access = await requestAccess();
  if (access.error) {
    throw new Error(access.error.message || "Wallet connection denied");
  }

  if (!access.address) {
    throw new Error("No wallet address returned from Freighter");
  }

  return access.address;
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

export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Friendbot funding failed");
  }
}

export interface SendPaymentResult {
  hash: string;
  explorerUrl: string;
}

export async function sendXlmPayment(
  sourcePublicKey: string,
  destination: string,
  amount: string
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

  const signResult = await signTransaction(transaction.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: sourcePublicKey,
  });

  if (signResult.error) {
    throw new Error(signResult.error.message || "Transaction signing failed");
  }

  const signedTx = TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const response = await server.submitTransaction(signedTx);

  return {
    hash: response.hash,
    explorerUrl: getExplorerUrl(response.hash),
  };
}

export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}
