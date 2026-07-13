import { isConnected as freighterIsConnected } from "@stellar/freighter-api";
import {
  AlbedoModule,
  FreighterModule,
  StellarWalletsKit,
  WalletNetwork,
  xBullModule,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { NETWORK_PASSPHRASE } from "./stellar";
import { AppWalletError, classifyAndThrow, extractErrorMessage } from "./errors";

/**
 * Keep Freighter listed in the modal even if the extension race fails.
 * Real install status is checked with Freighter's official async API on click.
 */
class AppFreighterModule extends FreighterModule {
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * Keep xBull listed for Yellow Belt multi-wallet UX.
 * Install check runs on click — missing extension → wallet-not-found banner.
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

/** Use Freighter's official API — do NOT rely on window.freighter (often unset). */
async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await freighterIsConnected();
    if (result.isConnected) return true;

    if (typeof window !== "undefined") {
      const w = window as Window & {
        freighter?: unknown;
        freighterApi?: unknown;
        stellar?: { provider?: string };
      };
      if (w.freighter || w.freighterApi || w.stellar?.provider === "freighter") {
        return true;
      }
    }

    return false;
  } catch {
    // Detection failed — don't block; let Freighter connect flow try.
    return true;
  }
}

function isXBullInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { xBullSDK?: unknown }).xBullSDK);
}

function walletKey(wallet: ISupportedWallet): string {
  return `${wallet.id} ${wallet.name}`.toLowerCase();
}

function walletNotFoundError(name: string, url: string): AppWalletError {
  return new AppWalletError(
    "WALLET_NOT_FOUND",
    `Wallet not found: ${name} is not installed. Download it from ${url} first, then try Connect again.`
  );
}

/** Only error when the wallet is actually missing — never block an installed Freighter. */
async function assertWalletInstalled(wallet: ISupportedWallet): Promise<void> {
  const key = walletKey(wallet);
  const name = wallet.name || wallet.id;

  if (key.includes("freighter")) {
    const installed = await isFreighterInstalled();
    if (!installed) {
      throw walletNotFoundError(name, WALLET_INSTALL_URLS.freighter);
    }
    return;
  }

  if (key.includes("xbull") && !isXBullInstalled()) {
    throw walletNotFoundError(name, WALLET_INSTALL_URLS.xbull);
  }
}

function mapConnectFailure(wallet: ISupportedWallet, error: unknown): unknown {
  const key = walletKey(wallet);
  const name = wallet.name || wallet.id;
  const message = extractErrorMessage(error).toLowerCase();

  if (
    message.includes("reject") ||
    message.includes("denied") ||
    message.includes("cancel") ||
    message.includes("declined")
  ) {
    return error;
  }

  if (
    key.includes("freighter") &&
    (message.includes("not connected") ||
      message.includes("not installed") ||
      message.includes("not found") ||
      message.includes("could not find") ||
      message.includes("no freighter"))
  ) {
    return walletNotFoundError(name, WALLET_INSTALL_URLS.freighter);
  }

  return error;
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
    let settled = false;
    let selected = false;

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      action();
    };

    walletKit.openModal({
      onWalletSelected: (wallet: ISupportedWallet) => {
        selected = true;

        void (async () => {
          try {
            await assertWalletInstalled(wallet);
            walletKit.setWallet(wallet.id);
            const { address } = await walletKit.getAddress();
            if (!address) {
              settle(() => reject(new Error("No wallet address returned")));
              return;
            }
            settle(() => resolve({ address, walletName: wallet.name }));
          } catch (error) {
            settle(() => reject(mapConnectFailure(wallet, error)));
          }
        })();
      },
      onClosed: (err) => {
        if (selected) return;
        settle(() =>
          reject(err instanceof Error ? err : new Error("Wallet selection cancelled"))
        );
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
