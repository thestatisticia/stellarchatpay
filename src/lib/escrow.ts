import {
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  nativeToScVal,
  Networks,
  scValToNative,
  TransactionBuilder,
  rpc,
} from "@stellar/stellar-sdk";
import {
  ESCROW_CONTRACT_ID,
  isEscrowConfigured,
  SOROBAN_RPC_URL,
} from "../config/contract";
import { NETWORK_PASSPHRASE } from "./stellar";

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const soroban = new rpc.Server(SOROBAN_RPC_URL);

export type EscrowStatus = "Open" | "Released" | "Refunded";

export interface EscrowEntry {
  id: number;
  from: string;
  to: string;
  amount: string;
  status: EscrowStatus;
}

export interface EscrowTxResult {
  hash: string;
  explorerUrl: string;
  escrowId?: number;
}

function xlmToStroops(amount: string): bigint {
  const parts = amount.split(".");
  const whole = parts[0] ?? "0";
  const frac = (parts[1] ?? "").padEnd(7, "0").slice(0, 7);
  return BigInt(whole) * 10_000_000n + BigInt(frac);
}

function stroopsToXlm(stroops: bigint | number | string): string {
  const value = BigInt(stroops);
  const whole = value / 10_000_000n;
  const frac = (value % 10_000_000n).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function getNativeTokenContractId(): string {
  return Asset.native().contractId(Networks.TESTNET);
}

async function waitForSuccessfulContractTx(hash: string): Promise<void> {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    try {
      const getResult = await soroban.getTransaction(hash);

      if (getResult.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (getResult.status === "FAILED") {
        throw new Error("Escrow contract call failed on network");
      }

      if (getResult.status === "SUCCESS") {
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Bad union switch") && !message.includes("Escrow contract call failed")) {
        throw error;
      }
      if (message.includes("Escrow contract call failed")) throw error;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Escrow call timed out while waiting for confirmation");
}

async function submitEscrowCall(
  sourceAddress: string,
  signTransaction: (xdr: string, address: string) => Promise<string>,
  buildOp: (contract: Contract) => ReturnType<Contract["call"]>
): Promise<{ hash: string; explorerUrl: string; retval?: unknown }> {
  if (!isEscrowConfigured()) {
    throw new Error("Escrow not configured. Set VITE_ESCROW_CONTRACT_ID after deployment.");
  }

  const contract = new Contract(ESCROW_CONTRACT_ID);
  const account = await horizon.loadAccount(sourceAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(buildOp(contract))
    .setTimeout(60)
    .build();

  const prepared = await soroban.prepareTransaction(tx);
  const signedXdr = await signTransaction(prepared.toXDR(), sourceAddress);
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await soroban.sendTransaction(signed);

  if (result.status === "ERROR") {
    throw new Error(result.errorResult?.toString() ?? "Escrow call failed");
  }
  if (result.status === "TRY_AGAIN_LATER") {
    throw new Error("Network busy. Please try the escrow call again.");
  }

  await waitForSuccessfulContractTx(result.hash);

  return {
    hash: result.hash,
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
  };
}

export async function createEscrow(
  sourceAddress: string,
  to: string,
  amount: string,
  signTransaction: (xdr: string, address: string) => Promise<string>
): Promise<EscrowTxResult> {
  const token = getNativeTokenContractId();
  const stroops = xlmToStroops(amount);

  const submitted = await submitEscrowCall(sourceAddress, signTransaction, (contract) =>
    contract.call(
      "create",
      nativeToScVal(sourceAddress, { type: "address" }),
      nativeToScVal(to, { type: "address" }),
      nativeToScVal(stroops, { type: "i128" }),
      nativeToScVal(token, { type: "address" })
    )
  );

  // Best-effort: read next_id - 1 after create
  let escrowId: number | undefined;
  try {
    const next = await getEscrowNextId();
    if (next !== null && next > 1) escrowId = next - 1;
  } catch {
    // ignore
  }

  return { ...submitted, escrowId };
}

export async function releaseEscrow(
  sourceAddress: string,
  id: number,
  signTransaction: (xdr: string, address: string) => Promise<string>
): Promise<EscrowTxResult> {
  const submitted = await submitEscrowCall(sourceAddress, signTransaction, (contract) =>
    contract.call("release", nativeToScVal(id, { type: "u32" }))
  );
  return { ...submitted, escrowId: id };
}

export async function refundEscrow(
  sourceAddress: string,
  id: number,
  signTransaction: (xdr: string, address: string) => Promise<string>
): Promise<EscrowTxResult> {
  const submitted = await submitEscrowCall(sourceAddress, signTransaction, (contract) =>
    contract.call("refund", nativeToScVal(id, { type: "u32" }))
  );
  return { ...submitted, escrowId: id };
}

function parseEscrowEntry(raw: unknown): EscrowEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const statusRaw = record.status;
  let status: EscrowStatus = "Open";
  if (typeof statusRaw === "string") {
    status = statusRaw as EscrowStatus;
  } else if (statusRaw && typeof statusRaw === "object") {
    const keys = Object.keys(statusRaw as object);
    if (keys[0] === "Released") status = "Released";
    else if (keys[0] === "Refunded") status = "Refunded";
    else status = "Open";
  }

  return {
    id: Number(record.id),
    from: String(record.from),
    to: String(record.to),
    amount: stroopsToXlm(String(record.amount ?? 0)),
    status,
  };
}

export async function getEscrow(id: number): Promise<EscrowEntry | null> {
  if (!isEscrowConfigured()) return null;

  const contract = new Contract(ESCROW_CONTRACT_ID);
  const source = await horizon.loadAccount(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
  );

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_escrow", nativeToScVal(id, { type: "u32" })))
    .setTimeout(30)
    .build();

  const sim = await soroban.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) return null;

  const val = sim.result?.retval;
  if (!val) return null;
  return parseEscrowEntry(scValToNative(val));
}

export async function getEscrowNextId(): Promise<number | null> {
  if (!isEscrowConfigured()) return null;

  const contract = new Contract(ESCROW_CONTRACT_ID);
  const source = await horizon.loadAccount(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
  );

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("next_id"))
    .setTimeout(30)
    .build();

  const sim = await soroban.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) return null;
  const val = sim.result?.retval;
  if (!val) return null;
  return Number(scValToNative(val));
}
