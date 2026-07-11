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

let kit: StellarWalletsKit | null = null;

export function getWalletKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      modules: [new FreighterModule(), new AlbedoModule(), new xBullModule()],
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
