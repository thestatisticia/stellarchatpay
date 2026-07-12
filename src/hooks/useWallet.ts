import { useCallback, useState } from "react";
import {
  disconnectWalletKit,
  openWalletModal,
  signWithWalletKit,
} from "../lib/wallet-kit";
import { fetchAccountBalance, fundTestnetAccount, type SignTransactionFn } from "../lib/stellar";
import { classifyAndThrow } from "../lib/errors";

interface WalletState {
  address: string | null;
  walletName: string | null;
  balance: string | null;
  isConnecting: boolean;
  isLoadingBalance: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    walletName: null,
    balance: null,
    isConnecting: false,
    isLoadingBalance: false,
    error: null,
  });

  const refreshBalance = useCallback(async (address: string) => {
    setState((prev) => ({
      ...prev,
      isLoadingBalance: prev.balance === null,
      error: null,
    }));
    try {
      const { balance, exists } = await fetchAccountBalance(address);
      setState((prev) => ({
        ...prev,
        balance,
        isLoadingBalance: false,
      }));
      return { balance, exists };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch balance";
      setState((prev) => ({
        ...prev,
        balance: "0",
        isLoadingBalance: false,
        error: message,
      }));
      return { balance: "0", exists: false };
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const { address, walletName } = await openWalletModal();
      setState((prev) => ({
        ...prev,
        address,
        walletName,
        isConnecting: false,
        balance: null,
        isLoadingBalance: true,
      }));

      const { exists } = await refreshBalance(address);
      return { address, walletName, accountExists: exists };
    } catch (error) {
      setState((prev) => ({ ...prev, isConnecting: false, isLoadingBalance: false }));
      classifyAndThrow(error);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(async () => {
    await disconnectWalletKit();
    setState({
      address: null,
      walletName: null,
      balance: null,
      isConnecting: false,
      isLoadingBalance: false,
      error: null,
    });
  }, []);

  const fundAccount = useCallback(async () => {
    if (!state.address) {
      throw new Error("Connect your wallet first");
    }
    const result = await fundTestnetAccount(state.address);
    await refreshBalance(state.address);
    return result;
  }, [state.address, refreshBalance]);

  const signTransaction: SignTransactionFn = useCallback(
    async (xdr, address) => signWithWalletKit(xdr, address),
    []
  );

  return {
    ...state,
    isConnected: Boolean(state.address),
    connect,
    disconnect,
    refreshBalance,
    fundAccount,
    signTransaction,
  };
}
