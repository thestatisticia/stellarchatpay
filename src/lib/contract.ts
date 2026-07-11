import {
  BASE_FEE,
  Contract,
  Horizon,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, isContractConfigured, SOROBAN_RPC_URL } from "../config/contract";
import { NETWORK_PASSPHRASE } from "./stellar";

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const soroban = new rpc.Server(SOROBAN_RPC_URL);

function xlmToStroops(amount: string): bigint {
  const parts = amount.split(".");
  const whole = parts[0] ?? "0";
  const frac = (parts[1] ?? "").padEnd(7, "0").slice(0, 7);
  return BigInt(whole) * 10_000_000n + BigInt(frac);
}

export interface PaymentEvent {
  id: string;
  from: string;
  to: string;
  amount: string;
  txHash: string;
  ledger: number;
}

export interface LogPaymentResult {
  hash: string;
  explorerUrl: string;
}

export async function logPaymentOnContract(
  sourceAddress: string,
  to: string,
  amount: string,
  paymentTxHash: string,
  signTransaction: (xdr: string, address: string) => Promise<string>
): Promise<LogPaymentResult> {
  if (!isContractConfigured()) {
    throw new Error("Contract not configured. Set VITE_CONTRACT_ID after deployment.");
  }

  const contract = new Contract(CONTRACT_ID);
  const account = await horizon.loadAccount(sourceAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "log_payment",
        nativeToScVal(sourceAddress, { type: "address" }),
        nativeToScVal(to, { type: "address" }),
        nativeToScVal(xlmToStroops(amount), { type: "i128" }),
        nativeToScVal(paymentTxHash, { type: "string" })
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await soroban.prepareTransaction(tx);
  const signedXdr = await signTransaction(prepared.toXDR(), sourceAddress);
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await soroban.sendTransaction(signed);

  if (result.status === "ERROR") {
    throw new Error(result.errorResult?.toString() ?? "Contract call failed");
  }

  if (result.status === "TRY_AGAIN_LATER") {
    throw new Error("Network busy. Please try the contract log again.");
  }

  await waitForSuccessfulContractTx(result.hash);

  return {
    hash: result.hash,
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
  };
}

async function waitForSuccessfulContractTx(hash: string): Promise<void> {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const getResult = await soroban.getTransaction(hash);

      if (getResult.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (getResult.status === "FAILED") {
        throw new Error("Contract call failed on network");
      }

      if (getResult.status === "SUCCESS") {
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Bad union switch")) {
        throw error;
      }
      // Older SDKs threw here while the tx was still confirming; retry briefly.
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Contract call timed out while waiting for confirmation");
}

export async function fetchRecentPaymentEvents(
  fromLedger?: number
): Promise<{ events: PaymentEvent[]; latestLedger: number }> {
  if (!isContractConfigured()) {
    return { events: [], latestLedger: fromLedger ?? 0 };
  }

  const latest = await soroban.getLatestLedger();
  const start = fromLedger ?? Math.max(1, latest.sequence - 500);

  const response = await soroban.getEvents({
    startLedger: start,
    endLedger: latest.sequence,
    filters: [
      {
        type: "contract",
        contractIds: [CONTRACT_ID],
      },
    ],
    limit: 50,
  });

  const events: PaymentEvent[] = response.events
    .map((event, index) => parsePaymentEvent(event, index))
    .filter((e): e is PaymentEvent => e !== null)
    .reverse();

  return { events, latestLedger: latest.sequence };
}

function parsePaymentEvent(
  event: rpc.Api.EventResponse,
  index: number
): PaymentEvent | null {
  try {
    if (event.type !== "contract" || !event.contractId) return null;

    const topics = event.topic ?? [];
    if (topics.length < 2) return null;

    const from = scValToNative(topics[0] as xdr.ScVal) as string;
    const to = scValToNative(topics[1] as xdr.ScVal) as string;

    let amount = "0";
    let txHash = "";

    if (event.value) {
      const vals = scValToNative(event.value) as Record<string, unknown>;
      if (vals && typeof vals === "object") {
        if ("amount" in vals) {
          const stroops = BigInt(String(vals.amount));
          amount = (Number(stroops) / 10_000_000).toString();
        }
        if ("tx_hash" in vals) txHash = String(vals.tx_hash);
      }
    }

    return {
      id: `${event.ledger}-${index}-${txHash}`,
      from,
      to,
      amount,
      txHash,
      ledger: event.ledger,
    };
  } catch {
    return null;
  }
}

export async function getContractPaymentCount(): Promise<number | null> {
  if (!isContractConfigured()) return null;

  const contract = new Contract(CONTRACT_ID);
  const source = await horizon.loadAccount(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
  );

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("payment_count"))
    .setTimeout(30)
    .build();

  const sim = await soroban.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) return null;

  const val = sim.result?.retval;
  if (!val) return null;
  return Number(scValToNative(val));
}
