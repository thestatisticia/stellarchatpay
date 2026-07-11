#!/usr/bin/env node
/**
 * Deploy the payment-log Soroban contract to Stellar testnet.
 * Requires: stellar CLI (https://developers.stellar.org/docs/tools/cli)
 *
 * Usage:
 *   stellar keys generate alice --network testnet
 *   curl "https://friendbot.stellar.org/?addr=$(stellar keys address alice)"
 *   npm run contract:build
 *   npm run contract:deploy
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const wasmPath = resolve(root, "contracts/payment-log/target/wasm32v1-none/release/payment_log.wasm");

try {
  execSync("stellar --version", { stdio: "ignore" });
} catch {
  console.error("Install Stellar CLI first: https://developers.stellar.org/docs/tools/cli");
  process.exit(1);
}

console.log("Deploying payment-log contract to testnet…");

const output = execSync(
  `stellar contract deploy --wasm "${wasmPath}" --source-account alice --network testnet`,
  { cwd: root, encoding: "utf8" }
);

const match = output.match(/C[A-Z0-9]{55}/);
if (!match) {
  console.log(output);
  console.error("Could not parse contract ID from deploy output.");
  process.exit(1);
}

const contractId = match[0];
const envPath = resolve(root, ".env.local");

writeFileSync(envPath, `VITE_CONTRACT_ID=${contractId}\n`, "utf8");

console.log("\nDeployed successfully!");
console.log("Contract ID:", contractId);
console.log("Saved to .env.local — add the same variable in Vercel.");
console.log("\nExample contract call tx will appear after you send a payment in the app.");
