/** Soroban payment-log contract deployed on Stellar testnet (Yellow Belt). */
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ??
  "CDPLACEHOLDER_DEPLOY_AND_SET_VITE_CONTRACT_ID";

export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const isContractConfigured = (): boolean =>
  CONTRACT_ID.startsWith("C") && !CONTRACT_ID.includes("PLACEHOLDER");
