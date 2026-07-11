import { useCallback, useEffect, useState } from "react";
import {
  connectWallet,
  fetchXlmBalance,
  fundTestnetAccount,
} from "../lib/stellar";

interface WalletState {
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  isLoadingBalance: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: null,
    isConnecting: false,
    isLoadingBalance: false,
    error: null,
  });

  const refreshBalance = useCallback(async (address: string) => {
    setState((prev) => ({ ...prev, isLoadingBalance: true, error: null }));
    try {
      const balance = await fetchXlmBalance(address);
      setState((prev) => ({
        ...prev,
        balance,
        isLoadingBalance: false,
      }));
      return balance;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch balance";
      setState((prev) => ({
        ...prev,
        isLoadingBalance: false,
        error: message,
      }));
      throw error;
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const address = await connectWallet();
      setState((prev) => ({
        ...prev,
        address,
        isConnecting: false,
      }));
      await refreshBalance(address);
      return address;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to connect wallet";
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
      throw error;
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    setState({
      address: null,
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
    await fundTestnetAccount(state.address);
    await refreshBalance(state.address);
  }, [state.address, refreshBalance]);

  useEffect(() => {
    if (!state.address) return;

    const interval = setInterval(() => {
      refreshBalance(state.address!).catch(() => undefined);
    }, 15000);

    return () => clearInterval(interval);
  }, [state.address, refreshBalance]);

  return {
    ...state,
    isConnected: Boolean(state.address),
    connect,
    disconnect,
    refreshBalance,
    fundAccount,
  };
}
