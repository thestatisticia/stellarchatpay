# Soroban contracts (Yellow + Orange Belt)

## Contracts

| Contract | Path | Role |
|----------|------|------|
| **payment-log** | `contracts/payment-log` | Records payments + emits events for the activity feed |
| **escrow** | `contracts/escrow` | Locks native XLM, releases/refunds, **calls payment-log** on release (inter-contract) |

## Prerequisites

- [Stellar CLI](https://developers.stellar.org/docs/tools/cli)
- Rust + `wasm32v1-none` target (`rustup target add wasm32v1-none`)
- Funded testnet account (Friendbot)

## Build & test locally

```bash
# Unit tests (no deploy needed)
npm run contract:test

# Build WASM for both contracts
npm run contract:build
```

## Deploy (testnet)

```bash
# 1. Key + fund (once)
stellar keys generate alice --network testnet
curl "https://friendbot.stellar.org/?addr=$(stellar keys address alice)"

# 2. Deploy payment-log → writes VITE_CONTRACT_ID
npm run contract:build
npm run contract:deploy

# 3. Deploy escrow + init(payment_log) → writes VITE_ESCROW_CONTRACT_ID
npm run contract:deploy:escrow
```

Restart `npm run dev` after updating `.env.local`.

## Verify escrow flow in the app

1. `escrow 1 to G...` — lock XLM (approve wallet)
2. `escrow status 1` — confirm **Open**
3. `escrow release 1` — pays recipient + invokes payment-log
4. `activity` — should include the escrow release log

## Architecture

```
User wallet
   │
   ├─ create(escrow) ──► escrow contract (holds XLM via native SAC)
   │
   └─ release(id) ──► escrow
                        ├─ transfer XLM → recipient
                        └─ invoke payment_log.log_payment(...)   ← inter-contract
```
