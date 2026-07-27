import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  disconnectWalletKit,
  openWalletModal,
  signWithWalletKit,
} from "../lib/wallet-kit";
import { fetchAccountBalance, fundTestnetAccount, type SignTransactionFn } from "../lib/stellar";
import { classifyAndThrow, formatWalletError } from "../lib/errors";

interface WalletState {
  address: string | null;
  walletName: string | null;
  balance: string | null;
  isConnecting: boolean;
  isLoadingBalance: boolean;
  error: string | null;
}

export interface WalletContextValue extends WalletState {
  isConnected: boolean;
  connect: () => Promise<{ address: string; walletName: string; accountExists: boolean }>;
  disconnect: () => Promise<void>;
  clearError: () => void;
  refreshBalance: (address: string) => Promise<{ balance: string | null; exists: boolean }>;
  fundAccount: () => Promise<Awaited<ReturnType<typeof fundTestnetAccount>>>;
  signTransaction: SignTransactionFn;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    walletName: null,
    balance: null,
    isConnecting: false,
    isLoadingBalance: false,
    error: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

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
        isLoadingBalance: false,
        error: message,
      }));
      return { balance: null, exists: false };
    }
  }, []);

  const connect = useCallback(async (): Promise<{
    address: string;
    walletName: string;
    accountExists: boolean;
  }> => {
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
        error: null,
      }));

      const { exists } = await refreshBalance(address);
      return { address, walletName, accountExists: exists };
    } catch (error) {
      const message = formatWalletError(error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isLoadingBalance: false,
        error: message,
      }));
      classifyAndThrow(error);
      throw error;
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

  const value = useMemo<WalletContextValue>(
    () => ({
      ...state,
      isConnected: Boolean(state.address),
      connect,
      disconnect,
      clearError,
      refreshBalance,
      fundAccount,
      signTransaction,
    }),
    [state, connect, disconnect, clearError, refreshBalance, fundAccount, signTransaction]
  );

  return createElement(WalletContext.Provider, { value }, children);
}

/** Shared wallet session — survives route changes (Chat → Activity → Insights). */
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
