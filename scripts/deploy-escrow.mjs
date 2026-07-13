#!/usr/bin/env node
/**
 * Deploy escrow contract and initialize it with the payment-log address.
 *
 * Prerequisites:
 *   - payment-log already deployed (VITE_CONTRACT_ID in .env.local)
 *   - stellar CLI + funded `alice` key on testnet
 *
 * Usage:
 *   npm run contract:build
 *   npm run contract:deploy:escrow
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const wasmPath = resolve(root, "contracts/escrow/target/wasm32v1-none/release/escrow.wasm");
const envPath = resolve(root, ".env.local");

function readEnvLocal() {
  if (!existsSync(envPath)) return {};
  const map = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function writeEnvLocal(values) {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`);
  writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");
}

try {
  execSync("stellar --version", { stdio: "ignore" });
} catch {
  console.error("Install Stellar CLI first: https://developers.stellar.org/docs/tools/cli");
  process.exit(1);
}

if (!existsSync(wasmPath)) {
  console.error("Missing escrow WASM. Run: npm run contract:build");
  process.exit(1);
}

const env = readEnvLocal();
const paymentLog = env.VITE_CONTRACT_ID;
if (!paymentLog || !paymentLog.startsWith("C")) {
  console.error("Set VITE_CONTRACT_ID in .env.local (deploy payment-log first).");
  process.exit(1);
}

console.log("Deploying escrow contract to testnet…");
const output = execSync(
  `stellar contract deploy --wasm "${wasmPath}" --source-account alice --network testnet`,
  { cwd: root, encoding: "utf8" }
);

const match = output.match(/C[A-Z0-9]{55}/);
if (!match) {
  console.log(output);
  console.error("Could not parse escrow contract ID from deploy output.");
  process.exit(1);
}

const escrowId = match[0];
console.log("Escrow contract:", escrowId);
console.log("Initializing escrow with payment-log:", paymentLog);

execSync(
  `stellar contract invoke --id ${escrowId} --source-account alice --network testnet -- init --payment_log ${paymentLog}`,
  { cwd: root, stdio: "inherit" }
);

writeEnvLocal({
  ...env,
  VITE_CONTRACT_ID: paymentLog,
  VITE_ESCROW_CONTRACT_ID: escrowId,
});

console.log("\nSaved to .env.local:");
console.log(`  VITE_CONTRACT_ID=${paymentLog}`);
console.log(`  VITE_ESCROW_CONTRACT_ID=${escrowId}`);
console.log("\nRestart npm run dev, then try: escrow 1 to G...");
