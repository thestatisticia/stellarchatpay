import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  NotFoundError,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { USDC_ASSET, type SwapAssetCode } from "../config/assets";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

const server = new Horizon.Server(HORIZON_URL);

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

function isMissingAccount(error: unknown): boolean {
  if (error instanceof NotFoundError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("404") || message.toLowerCase().includes("not found");
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
    if (isMissingAccount(error)) {
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
  const { balances, exists } = await fetchAccountBalances(publicKey);
  if (!exists) return "0";

  if (assetCode === "xlm") {
    return balances.find((b) => b.code === "XLM")?.balance ?? "0";
  }

  return balances.find((b) => b.code === "USDC")?.balance ?? "0";
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

export interface SwapQuote {
  fromAsset: SwapAssetCode;
  toAsset: SwapAssetCode;
  sendAmount: string;
  receiveAmount: string;
  destMin: string;
  fromLabel: string;
  toLabel: string;
  needsTrustline: boolean;
  rate: string;
  /** Intermediate assets between send and dest (empty = direct path). */
  path: Asset[];
}

function swapAssetPair(from: SwapAssetCode, to: SwapAssetCode) {
  return {
    sendAsset: from === "xlm" ? Asset.native() : USDC_ASSET,
    destAsset: to === "xlm" ? Asset.native() : USDC_ASSET,
    fromLabel: from.toUpperCase(),
    toLabel: to.toUpperCase(),
  };
}

function pathMatchesDestination(
  record: Horizon.ServerApi.PaymentPathRecord,
  toAsset: SwapAssetCode
): boolean {
  if (toAsset === "xlm") {
    return record.destination_asset_type === "native";
  }
  return (
    record.destination_asset_code === "USDC" &&
    record.destination_asset_issuer === USDC_ASSET.getIssuer()
  );
}

function applySlippage(amount: string, percent = 5): string {
  const value = parseFloat(amount);
  if (Number.isNaN(value) || value <= 0) return amount;
  return Math.max(value * (1 - percent / 100), 0.0000001).toFixed(7);
}

function formatRate(sendAmount: string, receiveAmount: string): string {
  const send = parseFloat(sendAmount);
  const receive = parseFloat(receiveAmount);
  if (Number.isNaN(send) || send <= 0 || Number.isNaN(receive)) return "—";
  return (receive / send).toFixed(7);
}

function assetFromHorizonPathHop(hop: {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}): Asset {
  if (hop.asset_type === "native") return Asset.native();
  if (!hop.asset_code || !hop.asset_issuer) {
    throw new Error("Invalid DEX path hop returned by Horizon.");
  }
  return new Asset(hop.asset_code, hop.asset_issuer);
}

/** Extract readable Horizon submit failures (avoids bare "status code 400"). */
export function formatHorizonSubmitError(error: unknown): string {
  const record = error as {
    message?: string;
    response?: {
      status?: number;
      data?: {
        title?: string;
        detail?: string;
        extras?: {
          result_codes?: {
            transaction?: string;
            operations?: string[];
          };
        };
      };
    };
  };

  const extras = record.response?.data?.extras?.result_codes;
  const opCodes = extras?.operations?.filter(Boolean) ?? [];
  const txCode = extras?.transaction;
  const codes = [...(txCode ? [txCode] : []), ...opCodes].map((c) => c.toLowerCase());

  if (codes.some((c) => c.includes("under_dest_min") || c.includes("too_few"))) {
    return "DEX rate moved before confirm. Run `swap …` again for a fresh quote, then confirm quickly.";
  }
  if (codes.some((c) => c.includes("no_trust"))) {
    return "Missing USDC trustline. Type `trust usdc`, approve it, then try the swap again.";
  }
  if (codes.some((c) => c.includes("underfunded"))) {
    return "Insufficient balance for this swap (include a small XLM fee buffer).";
  }
  if (codes.some((c) => c.includes("cross_self"))) {
    return "Swap path conflicts with your own order-book offers. Try a smaller amount.";
  }
  if (codes.some((c) => c.includes("line_full"))) {
    return "USDC trustline limit reached. Increase it with `trust usdc` or receive less.";
  }

  if (opCodes.length || txCode) {
    return `Swap rejected by Horizon (${[txCode, ...opCodes].filter(Boolean).join(", ")}). Try a fresh quote.`;
  }

  const detail = record.response?.data?.detail ?? record.response?.data?.title;
  if (detail) return detail;

  if (typeof record.message === "string" && record.message.includes("400")) {
    return "Swap transaction rejected (400). Rates may have moved — request a new quote and confirm again.";
  }

  return extractErrorMessageFallback(error);
}

function extractErrorMessageFallback(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong. Please try again.";
}

export async function getSwapQuote(
  publicKey: string,
  fromAsset: SwapAssetCode,
  amount: string,
  toAsset: SwapAssetCode
): Promise<SwapQuote> {
  if (fromAsset === toAsset) {
    throw new Error("Pick two different assets to swap (e.g. XLM and USDC).");
  }

  const { sendAsset, destAsset, fromLabel, toLabel } = swapAssetPair(
    fromAsset,
    toAsset
  );

  const needsTrustline =
    toAsset === "usdc" && !(await hasUsdcTrustline(publicKey));

  const paths = await server
    .strictSendPaths(sendAsset, amount, [destAsset])
    .call();

  const best = paths.records.find((record) => pathMatchesDestination(record, toAsset));

  if (!best) {
    throw new Error(
      "No swap path found on the testnet DEX for this amount. Try a smaller amount or type `fund` if your account is new."
    );
  }

  const receiveAmount = best.destination_amount;
  const path = (best.path ?? []).map((hop) => assetFromHorizonPathHop(hop));

  return {
    fromAsset,
    toAsset,
    sendAmount: best.source_amount,
    receiveAmount,
    destMin: applySlippage(receiveAmount),
    fromLabel,
    toLabel,
    needsTrustline,
    rate: formatRate(best.source_amount, receiveAmount),
    path,
  };
}

export function formatSwapQuoteMessage(quote: SwapQuote): string {
  const trustlineNote = quote.needsTrustline
    ? "\n\nWe'll add a **USDC trustline** automatically in the same transaction (first time only)."
    : "";

  return `**Swap quote**

You send **${quote.sendAmount} ${quote.fromLabel}**
You receive **≈ ${quote.receiveAmount} ${quote.toLabel}**
Rate **≈ ${quote.rate} ${quote.toLabel}** per ${quote.fromLabel}${trustlineNote}

Type \`confirm\` to proceed and approve in your wallet.`;
}

export async function executeSwap(
  publicKey: string,
  quote: SwapQuote,
  signTransaction: SignTransactionFn
): Promise<SwapResult> {
  let liveQuote: SwapQuote;
  try {
    // Refresh quote + trustline at confirm time so thin testnet liquidity doesn't
    // fail with a bare Horizon 400 between preview and wallet approval.
    liveQuote = await getSwapQuote(
      publicKey,
      quote.fromAsset,
      quote.sendAmount,
      quote.toAsset
    );
  } catch (error) {
    throw new Error(formatHorizonSubmitError(error));
  }

  const { sendAsset, destAsset, fromLabel, toLabel } = swapAssetPair(
    liveQuote.fromAsset,
    liveQuote.toAsset
  );

  const operationCount = liveQuote.needsTrustline ? 2 : 1;
  const fee = String(Number(BASE_FEE) * 100 * operationCount);

  try {
    const response = await submitSignedTransaction(publicKey, signTransaction, (account) => {
      const builder = new TransactionBuilder(account, {
        fee,
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (liveQuote.needsTrustline) {
        builder.addOperation(
          Operation.changeTrust({
            asset: USDC_ASSET,
            limit: "1000000",
          })
        );
      }

      builder.addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset,
          sendAmount: liveQuote.sendAmount,
          destination: publicKey,
          destAsset,
          destMin: liveQuote.destMin,
          path: liveQuote.path,
        })
      );

      return builder.setTimeout(180).build();
    });

    let receiveAmount = liveQuote.receiveAmount;
    try {
      const operations = await server
        .operations()
        .forTransaction(response.hash)
        .call();
      const pathOp = operations.records.find(
        (op) => op.type === "path_payment_strict_send"
      ) as { amount?: string } | undefined;
      if (pathOp?.amount) receiveAmount = pathOp.amount;
    } catch {
      // Horizon may lag; keep quoted receive amount.
    }

    return {
      hash: response.hash,
      explorerUrl: getExplorerUrl(response.hash),
      fromAsset: fromLabel,
      toAsset: toLabel,
      sendAmount: liveQuote.sendAmount,
      receiveAmount,
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error(formatHorizonSubmitError(error));
  }
}

/** @deprecated Use getSwapQuote + executeSwap for the confirm flow. */
export async function swapAssets(
  publicKey: string,
  fromAsset: SwapAssetCode,
  amount: string,
  toAsset: SwapAssetCode,
  signTransaction: SignTransactionFn
): Promise<SwapResult> {
  const quote = await getSwapQuote(publicKey, fromAsset, amount, toAsset);
  return executeSwap(publicKey, quote, signTransaction);
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
  try {
    return await server.submitTransaction(signedTx);
  } catch (error) {
    throw new Error(formatHorizonSubmitError(error));
  }
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
