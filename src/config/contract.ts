/** Soroban payment-log contract deployed on Stellar testnet (Yellow / Orange Belt). */
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ??
  "CDPLACEHOLDER_DEPLOY_AND_SET_VITE_CONTRACT_ID";

/** Escrow contract that locks XLM and calls payment-log on release (Orange Belt). */
export const ESCROW_CONTRACT_ID =
  import.meta.env.VITE_ESCROW_CONTRACT_ID ??
  "CDPLACEHOLDER_DEPLOY_ESCROW_AND_SET_VITE_ESCROW_CONTRACT_ID";

export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const isContractConfigured = (): boolean =>
  CONTRACT_ID.startsWith("C") && !CONTRACT_ID.includes("PLACEHOLDER");

export const isEscrowConfigured = (): boolean =>
  ESCROW_CONTRACT_ID.startsWith("C") && !ESCROW_CONTRACT_ID.includes("PLACEHOLDER");
