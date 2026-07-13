import {
  AlbedoModule,
  FreighterModule,
  StellarWalletsKit,
  WalletNetwork,
  xBullModule,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { NETWORK_PASSPHRASE } from "./stellar";
import { AppWalletError, classifyAndThrow } from "./errors";

/**
 * Keep Freighter listed in the modal even if the extension race fails.
 * Actual install check runs when the user picks Freighter.
 */
class AppFreighterModule extends FreighterModule {
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * Keep xBull listed for Yellow Belt multi-wallet UX.
 * Install check runs on click — missing extension → wallet-not-found error in chat.
 */
class AppXBullModule extends xBullModule {
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

const WALLET_INSTALL_URLS: Record<string, string> = {
  freighter: "https://www.freighter.app",
  xbull: "https://xbull.app",
  albedo: "https://albedo.link",
};

function isFreighterInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { freighter?: unknown; freighterApi?: unknown };
  return Boolean(w.freighter) || Boolean(w.freighterApi);
}

function isXBullInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { xBullSDK?: unknown }).xBullSDK);
}

/** Yellow Belt: wallet stays in the list; click without install → clear not-found error. */
function assertWalletInstalled(wallet: ISupportedWallet): void {
  const id = wallet.id.toLowerCase();
  const name = wallet.name || wallet.id;
  const url = WALLET_INSTALL_URLS[id] ?? wallet.url ?? "the wallet website";

  if (id === "freighter" && !isFreighterInstalled()) {
    throw new AppWalletError(
      "WALLET_NOT_FOUND",
      `Wallet not found: ${name} is not installed. Download it from ${url} first, then try Connect again.`
    );
  }

  if (id === "xbull" && !isXBullInstalled()) {
    throw new AppWalletError(
      "WALLET_NOT_FOUND",
      `Wallet not found: ${name} is not installed. Download it from ${url} first, then try Connect again.`
    );
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
          assertWalletInstalled(wallet);
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
