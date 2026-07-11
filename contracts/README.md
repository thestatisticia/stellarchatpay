# Deploy payment-log contract (Yellow Belt)

## Prerequisites

- [Stellar CLI](https://developers.stellar.org/docs/tools/cli)
- Rust + `wasm32-unknown-unknown` target
- Funded testnet account (Friendbot)

## Steps

```bash
# 1. Generate a deployer key
stellar keys generate alice --network testnet

# 2. Fund it
curl "https://friendbot.stellar.org/?addr=$(stellar keys address alice)"

# 3. Build the contract WASM
cd contracts/payment-log
stellar contract build
cd ../..

# 4. Deploy to testnet
npm run contract:deploy
```

This writes `VITE_CONTRACT_ID` to `.env.local`. Add the same variable in **Vercel → Settings → Environment Variables**, then redeploy the frontend.

## Verify

1. Send a payment in the app (`send 1 to G...`)
2. Approve the contract `log_payment` call in your wallet
3. Type `activity` in chat to see the on-chain feed
4. Copy the contract call tx hash from chat into [Stellar Expert](https://stellar.expert/explorer/testnet)
