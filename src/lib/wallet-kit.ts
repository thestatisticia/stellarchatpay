import {
  AlbedoModule,
  FreighterModule,
  StellarWalletsKit,
  WalletNetwork,
  xBullModule,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { NETWORK_PASSPHRASE } from "./stellar";
import { classifyAndThrow } from "./errors";

/**
 * Freighter's default isAvailable() is async and often loses the kit's 500ms race,
 * which marks it "Not available" even when the extension is installed.
 * List it like Albedo/xBull — the connect flow handles install/approval prompts.
 */
class AppFreighterModule extends FreighterModule {
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/** Only list xBull when the browser extension is installed — avoids opening wallet.xbull.app for everyone. */
class AppXBullModule extends xBullModule {
  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return Boolean((window as Window & { xBullSDK?: unknown }).xBullSDK);
  }
}

let kit: StellarWalletsKit | null = null;

export function getWalletKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      modules: [new AppFreighterModule(), new AlbedoModule(), new AppXBullModule()],
    });
  }
  return kit;
}

export interface WalletConnection {
  address: string;
  walletName: string;
}

export async function openWalletModal(): Promise<WalletConnection> {
  const walletKit = getWalletKit();

  return new Promise((resolve, reject) => {
    walletKit.openModal({
      onWalletSelected: async (wallet: ISupportedWallet) => {
        try {
          walletKit.setWallet(wallet.id);
          const { address } = await walletKit.getAddress();
          if (!address) {
            reject(new Error("No wallet address returned"));
            return;
          }
          resolve({ address, walletName: wallet.name });
        } catch (error) {
          reject(error);
        }
      },
      onClosed: (err) => {
        if (err) {
          reject(err);
          return;
        }
        reject(new Error("Wallet selection cancelled"));
      },
    });
  });
}

export async function disconnectWalletKit(): Promise<void> {
  try {
    await getWalletKit().disconnect();
  } catch {
    // ignore
  }
}

export async function signWithWalletKit(
  xdr: string,
  address: string
): Promise<string> {
  try {
    const { signedTxXdr } = await getWalletKit().signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address,
    });

    if (!signedTxXdr) {
      throw new Error("No signed transaction returned");
    }

    return signedTxXdr;
  } catch (error) {
    classifyAndThrow(error);
  }
}

export function listSupportedWallets(): string[] {
  return ["Freighter", "Albedo", "xBull"];
}
