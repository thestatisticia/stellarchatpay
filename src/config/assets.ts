import { Asset } from "@stellar/stellar-sdk";

/** Circle testnet USDC issuer on Stellar testnet */
export const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const USDC_ASSET = new Asset("USDC", USDC_ISSUER);

export const SWAP_ASSETS = {
  xlm: { code: "XLM", asset: Asset.native() },
  usdc: { code: "USDC", asset: USDC_ASSET },
} as const;

export type SwapAssetCode = keyof typeof SWAP_ASSETS;

export function resolveSwapAsset(code: string): SwapAssetCode | null {
  const normalized = code.trim().toLowerCase();
  if (normalized === "xlm" || normalized === "native") return "xlm";
  if (normalized === "usdc") return "usdc";
  return null;
}
