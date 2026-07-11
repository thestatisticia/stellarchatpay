import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { USDC_ASSET, type SwapAssetCode } from "../config/assets";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

const server = new Horizon.Server(HORIZON_URL);
const PATH_PAYMENT_FEE = String(Number(BASE_FEE) * 100);

export type SignTransactionFn = (
  xdr: string,
  address: string
) => Promise<string>;

export interface AssetBalance {
  code: string;
  balance: string;
  assetType: "native" | "credit";
}

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

function isCreditBalance(
  balance: Horizon.HorizonApi.BalanceLine
): balance is Horizon.HorizonApi.BalanceLineAsset<
  "credit_alphanum4" | "credit_alphanum12"
> {
  return (
    balance.asset_type === "credit_alphanum4" ||
    balance.asset_type === "credit_alphanum12"
  );
}

function balanceForAsset(
  balances: Horizon.HorizonApi.BalanceLine[],
  asset: Asset
): string {
  if (asset.isNative()) {
    const native = balances.find((b) => b.asset_type === "native");
    return native?.balance ?? "0";
  }

  const match = balances.find(
    (b) =>
      isCreditBalance(b) &&
      b.asset_code === asset.getCode() &&
      b.asset_issuer === asset.getIssuer()
  );
  return match?.balance ?? "0";
}

export async function fetchAccountBalances(publicKey: string): Promise<{
  balances: AssetBalance[];
  exists: boolean;
}> {
  try {
    const account = await server.loadAccount(publicKey);
    const balances: AssetBalance[] = account.balances.map((b) => {
      if (b.asset_type === "native") {
        return { code: "XLM", balance: b.balance, assetType: "native" };
      }
      if (isCreditBalance(b)) {
        return {
          code: b.asset_code ?? "UNKNOWN",
          balance: b.balance,
          assetType: "credit",
        };
      }
      return {
        code: "POOL",
        balance: b.balance,
        assetType: "credit",
      };
    });
    return { balances, exists: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      return { balances: [], exists: false };
    }
    throw error;
  }
}

export async function fetchAccountBalance(publicKey: string): Promise<{
  balance: string;
  exists: boolean;
}> {
  const { balances, exists } = await fetchAccountBalances(publicKey);
  const xlm = balances.find((b) => b.code === "XLM");
  return { balance: xlm?.balance ?? "0", exists };
}

export async function fetchXlmBalance(publicKey: string): Promise<string> {
  const { balance } = await fetchAccountBalance(publicKey);
  return balance;
}

export async function fetchAssetBalance(
  publicKey: string,
  assetCode: SwapAssetCode
): Promise<string> {
  const account = await server.loadAccount(publicKey);
  if (assetCode === "xlm") {
    return balanceForAsset(account.balances, Asset.native());
  }
  return balanceForAsset(account.balances, USDC_ASSET);
}

export async function hasUsdcTrustline(publicKey: string): Promise<boolean> {
  try {
    const account = await server.loadAccount(publicKey);
    return account.balances.some(
      (b) =>
        isCreditBalance(b) &&
        b.asset_code === "USDC" &&
        b.asset_issuer === USDC_ASSET.getIssuer()
    );
  } catch {
    return false;
  }
}

export async function createUsdcTrustline(
  publicKey: string,
  signTransaction: SignTransactionFn
): Promise<SendPaymentResult> {
  const account = await server.loadAccount(publicKey);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: USDC_ASSET,
        limit: "1000000",
      })
    )
    .setTimeout(30)
    .build();

  const signedXdr = await signTransaction(transaction.toXDR(), publicKey);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const response = await server.submitTransaction(signedTx);

  return {
    hash: response.hash,
    explorerUrl: getExplorerUrl(response.hash),
  };
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

export interface SwapResult extends SendPaymentResult {
  fromAsset: string;
  toAsset: string;
  sendAmount: string;
  receiveAmount: string;
}

async function submitSignedTransaction(
  publicKey: string,
  signTransaction: SignTransactionFn,
  build: (account: Horizon.AccountResponse) => ReturnType<TransactionBuilder["build"]>
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  const account = await server.loadAccount(publicKey);
  const transaction = build(account);
  const signedXdr = await signTransaction(transaction.toXDR(), publicKey);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  return server.submitTransaction(signedTx);
}

export async function swapAssets(
  publicKey: string,
  fromAsset: SwapAssetCode,
  amount: string,
  toAsset: SwapAssetCode,
  signTransaction: SignTransactionFn
): Promise<SwapResult> {
  if (fromAsset === toAsset) {
    throw new Error("Pick two different assets to swap (e.g. XLM and USDC).");
  }

  if (toAsset === "usdc") {
    const trusted = await hasUsdcTrustline(publicKey);
    if (!trusted) {
      throw new Error(
        "Add a USDC trustline first. Type `trust usdc` then try the swap again."
      );
    }
  }

  const sendAsset = fromAsset === "xlm" ? Asset.native() : USDC_ASSET;
  const destAsset = toAsset === "xlm" ? Asset.native() : USDC_ASSET;
  const fromLabel = fromAsset.toUpperCase();
  const toLabel = toAsset.toUpperCase();

  const response = await submitSignedTransaction(publicKey, signTransaction, (account) =>
    new TransactionBuilder(account, {
      fee: PATH_PAYMENT_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          destination: publicKey,
          sendAsset,
          sendAmount: amount,
          destAsset,
          destMin: "0.0000001",
        })
      )
      .setTimeout(30)
      .build()
  );

  let receiveAmount = amount;
  try {
    const operations = await server
      .operations()
      .forTransaction(response.hash)
      .call();
    const operation = operations.records[0] as { amount?: string } | undefined;
    if (operation?.amount) receiveAmount = operation.amount;
  } catch {
    // Fall back to send amount if Horizon hasn't indexed the tx yet.
  }

  return {
    hash: response.hash,
    explorerUrl: getExplorerUrl(response.hash),
    fromAsset: fromLabel,
    toAsset: toLabel,
    sendAmount: amount,
    receiveAmount,
  };
}

export async function sendXlmPayment(
  sourcePublicKey: string,
  destination: string,
  amount: string,
  signTransaction: SignTransactionFn
): Promise<SendPaymentResult> {
  const response = await submitSignedTransaction(
    sourcePublicKey,
    signTransaction,
    (account) =>
      new TransactionBuilder(account, {
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
        .build()
  );

  return {
    hash: response.hash,
    explorerUrl: getExplorerUrl(response.hash),
  };
}

export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}
