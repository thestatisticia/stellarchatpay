import { useCallback, useRef, useState } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { WalletHeader } from "./components/WalletHeader";
import { usePaymentEvents } from "./hooks/usePaymentEvents";
import { useTheme } from "./hooks/useTheme";
import { useWallet } from "./hooks/useWallet";
import { isContractConfigured, isEscrowConfigured } from "./config/contract";
import {
  HELP_MESSAGE,
  WELCOME_MESSAGE,
  createMessage,
  explainEscrowCommandFailure,
  explainSendCommandFailure,
  explainSwapCommandFailure,
  parseBalanceCommand,
  parseConfirmCommand,
  parseEscrowCommand,
  parseFundCommand,
  parseSendCommand,
  parseSwapCommand,
  parseTrustCommand,
  type ChatMessage,
} from "./lib/chat";
import {
  fetchRecentPaymentEvents,
  getContractPaymentCount,
  logPaymentOnContract,
} from "./lib/contract";
import {
  createEscrow,
  getEscrow,
  refundEscrow,
  releaseEscrow,
} from "./lib/escrow";
import {
  assertSufficientBalance,
  formatWalletError,
} from "./lib/errors";
import {
  executeSwap,
  createUsdcTrustline,
  fetchAccountBalance,
  fetchAssetBalance,
  fetchXlmBalance,
  fundTestnetAccount,
  getAccountExplorerUrl,
  getSwapQuote,
  hasUsdcTrustline,
  isValidStellarAddress,
  sendXlmPayment,
  type SwapQuote,
} from "./lib/stellar";

function App() {
  const wallet = useWallet();
  const { theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage({
      role: "bot",
      content: WELCOME_MESSAGE,
      status: "info",
    }),
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const pendingSwap = useRef<SwapQuote | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, createMessage(message)]);
  }, []);

  const pushPendingMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp" | "status">) => {
    const created = createMessage({ ...message, status: "pending" });
    setMessages((prev) => [...prev, created]);
    return created.id;
  }, []);

  const patchMessage = useCallback(
    (id: string, patch: Partial<Omit<ChatMessage, "id" | "timestamp">>) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    []
  );

  const handleLiveEvent = useCallback(
    (event: { from: string; to: string; amount: string; txHash: string }) => {
      if (event.from !== wallet.address && event.to !== wallet.address) return;

      addMessage({
        role: "bot",
        content: `**Live feed** — \`${event.from.slice(0, 6)}…\` sent **${event.amount} XLM** → \`${event.to.slice(0, 6)}…\``,
        status: "info",
        txHash: event.txHash,
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${event.txHash}`,
        amount: event.amount,
        destination: event.to,
      });
    },
    [addMessage, wallet.address]
  );

  usePaymentEvents(wallet.isConnected, handleLiveEvent);
  const handleConnect = async () => {
    setConnectError(null);
    try {
      const { address, walletName, accountExists } = await wallet.connect();
      setConnectError(null);
      addMessage({ role: "system", content: `Connected via ${walletName}` });
      addMessage({
        role: "bot",
        content: accountExists
          ? `You're live on testnet as \`${address.slice(0, 8)}…${address.slice(-6)}\`.\n\nTry \`balance\`, \`send 10 to G...\`, or \`swap 10 xlm to usdc\`.`
          : `Connected as \`${address.slice(0, 8)}…${address.slice(-6)}\`.\n\nThis account is not funded on testnet yet — type \`fund\` to get XLM from Friendbot.`,
        status: "success",
      });
    } catch (error) {
      const message = formatWalletError(error);
      // Only skip a quiet dismiss of the picker — always show wallet-not-found / reject / etc.
      if (
        message === "Wallet selection cancelled" ||
        message === "Wallet connection cancelled."
      ) {
        return;
      }
      // Chat is hidden until connect succeeds — show errors on the hero screen instead.
      setConnectError(message);
    }
  };

  const handleDisconnect = async () => {
    pendingSwap.current = null;
    await wallet.disconnect();
    addMessage({ role: "system", content: "Wallet disconnected" });
    addMessage({
      role: "bot",
      content: "Disconnected. Connect again to pick Freighter, Albedo, or xBull.",
      status: "info",
    });
  };

  const processCommand = async (rawInput: string) => {
    const command = rawInput.trim().toLowerCase();

    if (command === "help") {
      addMessage({ role: "bot", content: HELP_MESSAGE, status: "info" });
      return;
    }

    const escrow = parseEscrowCommand(rawInput);
    if (escrow) {
      if (!wallet.address) return;

      if (!isEscrowConfigured()) {
        addMessage({
          role: "bot",
          content:
            "Escrow contract not configured yet. Deploy it locally, set `VITE_ESCROW_CONTRACT_ID` in `.env.local`, then restart `npm run dev`.",
          status: "error",
        });
        return;
      }

      if (escrow.action === "status") {
        const pendingId = pushPendingMessage({
          role: "bot",
          content: `Looking up escrow **#${escrow.id}**…`,
        });
        try {
          const entry = await getEscrow(escrow.id);
          if (!entry) {
            patchMessage(pendingId, {
              content: `Escrow **#${escrow.id}** was not found.`,
              status: "error",
            });
            return;
          }
          patchMessage(pendingId, {
            content: `Escrow **#${entry.id}** details.`,
            status: "success",
            card: {
              kind: "escrow",
              action: "status",
              id: entry.id,
              amount: entry.amount,
              destination: entry.to,
              from: entry.from,
              escrowStatus: entry.status,
            },
          });
        } catch (error) {
          patchMessage(pendingId, {
            content: formatWalletError(error),
            status: "error",
          });
        }
        return;
      }

      if (escrow.action === "create") {
        const amount = parseFloat(escrow.amount);
        if (Number.isNaN(amount) || amount <= 0) {
          addMessage({
            role: "bot",
            content: "Enter an amount greater than 0.",
            status: "error",
          });
          return;
        }
        if (!isValidStellarAddress(escrow.destination)) {
          addMessage({
            role: "bot",
            content: "That doesn't look like a valid Stellar address (starts with `G`, 56 chars).",
            status: "error",
          });
          return;
        }
        if (escrow.destination === wallet.address) {
          addMessage({
            role: "bot",
            content: "You can't escrow to your own address.",
            status: "error",
          });
          return;
        }

        try {
          await assertSufficientBalance(wallet.address, escrow.amount, fetchXlmBalance);
        } catch (error) {
          addMessage({
            role: "bot",
            content: formatWalletError(error),
            status: "error",
          });
          return;
        }

        const pendingId = pushPendingMessage({
          role: "bot",
          content: "Preparing escrow… Contacting Horizon.",
          card: {
            kind: "escrow",
            action: "create",
            amount: escrow.amount,
            destination: escrow.destination,
          },
        });

        try {
          patchMessage(pendingId, {
            content: "Waiting for wallet approval to lock funds…",
          });
          const result = await createEscrow(
            wallet.address,
            escrow.destination,
            escrow.amount,
            wallet.signTransaction
          );
          await wallet.refreshBalance(wallet.address);
          patchMessage(pendingId, {
            content: `Funds locked.${result.escrowId ? ` Release with \`escrow release ${result.escrowId}\` or refund with \`escrow refund ${result.escrowId}\`.` : ""}`,
            status: "success",
            txHash: result.hash,
            explorerUrl: result.explorerUrl,
            amount: escrow.amount,
            destination: escrow.destination,
            card: {
              kind: "escrow",
              action: "create",
              id: result.escrowId,
              amount: escrow.amount,
              destination: escrow.destination,
              escrowStatus: "Open",
            },
          });
        } catch (error) {
          patchMessage(pendingId, {
            content: formatWalletError(error),
            status: "error",
            card: undefined,
          });
        }
        return;
      }

      if (escrow.action === "release" || escrow.action === "refund") {
        const verb = escrow.action === "release" ? "release" : "refund";
        const pendingId = pushPendingMessage({
          role: "bot",
          content: `Preparing escrow ${verb}… Contacting Horizon.`,
          card: {
            kind: "escrow",
            action: escrow.action,
            id: escrow.id,
          },
        });

        try {
          patchMessage(pendingId, {
            content: `Waiting for wallet approval to ${verb} escrow **#${escrow.id}**…`,
          });
          const result =
            escrow.action === "release"
              ? await releaseEscrow(wallet.address, escrow.id, wallet.signTransaction)
              : await refundEscrow(wallet.address, escrow.id, wallet.signTransaction);

          await wallet.refreshBalance(wallet.address);
          patchMessage(pendingId, {
            content:
              escrow.action === "release"
                ? "Recipient paid and payment-log updated (inter-contract)."
                : "Funds returned to your wallet.",
            status: "success",
            txHash: result.hash,
            explorerUrl: result.explorerUrl,
            card: {
              kind: "escrow",
              action: escrow.action,
              id: escrow.id,
              escrowStatus: escrow.action === "release" ? "Released" : "Refunded",
            },
          });
        } catch (error) {
          patchMessage(pendingId, {
            content: formatWalletError(error),
            status: "error",
            card: undefined,
          });
        }
        return;
      }
    }

    if (command === "activity") {
      if (!isContractConfigured()) {
        addMessage({
          role: "bot",
          content: "Contract not deployed yet. Set `VITE_CONTRACT_ID` after deploying the payment-log contract.",
          status: "error",
        });
        return;
      }

      addMessage({ role: "bot", content: "Fetching on-chain activity…", status: "pending" });
      try {
        const count = await getContractPaymentCount();
        const { events } = await fetchRecentPaymentEvents();

        if (events.length === 0) {
          addMessage({
            role: "bot",
            content: `No payments logged yet.${count !== null ? ` Total on contract: **${count}**.` : ""}\n\nSend XLM with \`send 10 to G...\` to create activity.`,
            status: "info",
          });
          return;
        }

        const lines = events.slice(0, 5).map(
          (e) =>
            `• \`${e.from.slice(0, 6)}…\` → \`${e.to.slice(0, 6)}…\` · **${e.amount} XLM**`
        );

        addMessage({
          role: "bot",
          content: `**Recent activity** (${events.length} event${events.length === 1 ? "" : "s"})\n\n${lines.join("\n")}${count !== null ? `\n\nTotal logged: **${count}**` : ""}`,
          status: "success",
        });
      } catch (error) {
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    if (command === "balance usdc") {
      if (!wallet.address) return;
      const pendingId = pushPendingMessage({
        role: "bot",
        content: "Checking USDC balance…",
      });
      try {
        const balance = await fetchAssetBalance(wallet.address, "usdc");
        const trusted = await hasUsdcTrustline(wallet.address);
        if (!trusted) {
          patchMessage(pendingId, {
            content: "No USDC yet. Your first `swap … to usdc` adds a trustline automatically.",
            status: "info",
          });
          return;
        }
        patchMessage(pendingId, {
          content: "USDC balance on testnet.",
          status: "success",
          card: {
            kind: "balance",
            asset: "USDC",
            balance,
            address: wallet.address,
          },
        });
      } catch (error) {
        patchMessage(pendingId, {
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    if (parseTrustCommand(rawInput)) {
      if (!wallet.address) return;

      try {
        const trusted = await hasUsdcTrustline(wallet.address);
        if (trusted) {
          addMessage({
            role: "bot",
            content: "Your wallet already has a USDC trustline. Try `swap 10 xlm to usdc`.",
            status: "info",
          });
          return;
        }

        addMessage({
          role: "bot",
          content: "Adding USDC trustline… approve in your wallet.",
          status: "pending",
        });

        const result = await createUsdcTrustline(wallet.address, wallet.signTransaction);
        addMessage({
          role: "bot",
          content: "USDC trustline added. You can now swap XLM ↔ USDC on testnet.",
          status: "success",
          txHash: result.hash,
          explorerUrl: result.explorerUrl,
        });
      } catch (error) {
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    if (parseConfirmCommand(rawInput)) {
      if (!wallet.address) return;

      const quote = pendingSwap.current;
      if (!quote) {
        addMessage({
          role: "bot",
          content: "No swap waiting for confirmation. Start with `swap 10 xlm to usdc`.",
          status: "info",
        });
        return;
      }

      const pendingId = pushPendingMessage({
        role: "bot",
        content: "Preparing swap… Contacting Horizon.",
        card: {
          kind: "swapResult",
          sendAmount: quote.sendAmount,
          receiveAmount: quote.receiveAmount,
          fromLabel: quote.fromLabel,
          toLabel: quote.toLabel,
        },
      });

      try {
        patchMessage(pendingId, {
          content: "Refreshing quote, then waiting for wallet approval…",
        });
        const result = await executeSwap(
          wallet.address,
          quote,
          wallet.signTransaction
        );

        pendingSwap.current = null;
        await wallet.refreshBalance(wallet.address);

        patchMessage(pendingId, {
          content: "Swap settled on testnet.",
          status: "success",
          txHash: result.hash,
          explorerUrl: result.explorerUrl,
          card: {
            kind: "swapResult",
            sendAmount: result.sendAmount,
            receiveAmount: result.receiveAmount,
            fromLabel: result.fromAsset,
            toLabel: result.toAsset,
          },
        });
      } catch (error) {
        patchMessage(pendingId, {
          content: formatWalletError(error),
          status: "error",
          card: undefined,
        });
      }
      return;
    }

    const swap = parseSwapCommand(rawInput);
    if (swap) {
      if (!wallet.address) return;

      const amount = parseFloat(swap.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        addMessage({
          role: "bot",
          content: "Enter an amount greater than 0.",
          status: "error",
        });
        return;
      }

      try {
        await assertSufficientBalance(
          wallet.address,
          swap.amount,
          (address) => fetchAssetBalance(address, swap.from),
          swap.from.toUpperCase()
        );
      } catch (error) {
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
        });
        return;
      }

      const quotePendingId = pushPendingMessage({
        role: "bot",
        content: "Contacting Horizon for a DEX path…",
      });

      try {
        const quote = await getSwapQuote(
          wallet.address,
          swap.from,
          swap.amount,
          swap.to
        );

        pendingSwap.current = quote;

        patchMessage(quotePendingId, {
          content: "Review the quote, then confirm.",
          status: "info",
          card: {
            kind: "swapQuote",
            sendAmount: quote.sendAmount,
            receiveAmount: quote.receiveAmount,
            fromLabel: quote.fromLabel,
            toLabel: quote.toLabel,
            rate: quote.rate,
            needsTrustline: quote.needsTrustline,
          },
          actionCommand: "confirm",
          actionLabel: "Confirm swap",
        });
      } catch (error) {
        pendingSwap.current = null;
        patchMessage(quotePendingId, {
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    if (command === "balance") {
      if (!wallet.address) return;
      const pendingId = pushPendingMessage({
        role: "bot",
        content: "Checking balance on Horizon…",
      });
      try {
        const { balance, exists } = await fetchAccountBalance(wallet.address);
        await wallet.refreshBalance(wallet.address);
        if (!exists) {
          patchMessage(pendingId, {
            content: "This account is not funded on testnet yet. Type `fund` to get XLM from Friendbot.",
            status: "error",
          });
          return;
        }
        patchMessage(pendingId, {
          content: "Your XLM balance on testnet.",
          status: "success",
          card: {
            kind: "balance",
            asset: "XLM",
            balance,
            address: wallet.address,
          },
        });
      } catch (error) {
        patchMessage(pendingId, {
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    const otherAddress = parseBalanceCommand(rawInput);
    if (otherAddress) {
      if (!isValidStellarAddress(otherAddress)) {
        addMessage({
          role: "bot",
          content: "That doesn't look like a valid Stellar address (starts with `G`, 56 chars).",
          status: "error",
        });
        return;
      }

      const pendingId = pushPendingMessage({
        role: "bot",
        content: "Looking up account on Horizon…",
      });

      try {
        const { balance, exists } = await fetchAccountBalance(otherAddress);

        if (!exists) {
          patchMessage(pendingId, {
            content: `Account \`${otherAddress.slice(0, 8)}…${otherAddress.slice(-6)}\` was not found on testnet. It may be unfunded or the address is wrong.`,
            status: "error",
          });
          return;
        }

        patchMessage(pendingId, {
          content: wallet.address === otherAddress ? "Your XLM balance on testnet." : "Account balance on testnet.",
          status: "success",
          explorerUrl: getAccountExplorerUrl(otherAddress),
          card: {
            kind: "balance",
            asset: "XLM",
            balance,
            address: otherAddress,
          },
        });
      } catch (error) {
        patchMessage(pendingId, {
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    const fundAddress = parseFundCommand(rawInput);
    if (fundAddress) {
      if (!isValidStellarAddress(fundAddress)) {
        addMessage({
          role: "bot",
          content: "That doesn't look like a valid Stellar address (starts with `G`, 56 chars).",
          status: "error",
        });
        return;
      }

      const short = `${fundAddress.slice(0, 8)}…${fundAddress.slice(-6)}`;
      addMessage({
        role: "bot",
        content: `Requesting Friendbot funding for \`${short}\`…`,
        status: "pending",
      });

      try {
        const result = await fundTestnetAccount(fundAddress);
        const { balance } = await fetchAccountBalance(fundAddress);

        if (wallet.address === fundAddress) {
          await wallet.refreshBalance(fundAddress);
        }

        addMessage({
          role: "bot",
          content:
            result.status === "already_funded"
              ? `${result.message}\n\nCurrent balance: **${balance} XLM**.`
              : `${result.message}\n\nBalance for \`${short}\` is now **${balance} XLM**.`,
          status: result.status === "already_funded" ? "info" : "success",
          explorerUrl: getAccountExplorerUrl(fundAddress),
        });
      } catch (error) {
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    if (command === "fund") {
      if (!wallet.address) return;
      addMessage({
        role: "bot",
        content: "Requesting Friendbot funding for your wallet…",
        status: "pending",
      });
      try {
        const result = await wallet.fundAccount();
        const balance =
          wallet.balance ??
          (await wallet.refreshBalance(wallet.address)).balance;

        addMessage({
          role: "bot",
          content:
            result.status === "already_funded"
              ? `${result.message}\n\nYour balance is **${balance} XLM**.`
              : `${result.message}\n\nYour balance is now **${balance} XLM**.`,
          status: result.status === "already_funded" ? "info" : "success",
        });
      } catch (error) {
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    const payment = parseSendCommand(rawInput);
    if (payment) {
      if (!wallet.address) return;

      const amount = parseFloat(payment.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        addMessage({
          role: "bot",
          content: "Enter an amount greater than 0.",
          status: "error",
        });
        return;
      }

      if (!isValidStellarAddress(payment.destination)) {
        addMessage({
          role: "bot",
          content: "That doesn't look like a valid Stellar address (starts with `G`, 56 chars).",
          status: "error",
        });
        return;
      }

      if (payment.destination === wallet.address) {
        addMessage({
          role: "bot",
          content: "You can't send to your own address.",
          status: "error",
        });
        return;
      }

      try {
        await assertSufficientBalance(
          wallet.address,
          payment.amount,
          fetchXlmBalance
        );
      } catch (error) {
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
        });
        return;
      }

      const paymentPendingId = pushPendingMessage({
        role: "bot",
        content: "Preparing payment… Contacting Horizon.",
        card: {
          kind: "payment",
          amount: payment.amount,
          destination: payment.destination,
        },
      });

      try {
        patchMessage(paymentPendingId, {
          content: "Waiting for wallet approval to send payment…",
        });
        const result = await sendXlmPayment(
          wallet.address,
          payment.destination,
          payment.amount,
          wallet.signTransaction
        );

        await wallet.refreshBalance(wallet.address);

        if (!isContractConfigured()) {
          patchMessage(paymentPendingId, {
            content: "Payment sent on Stellar.",
            status: "success",
            txHash: result.hash,
            explorerUrl: result.explorerUrl,
            amount: payment.amount,
            destination: payment.destination,
            card: {
              kind: "payment",
              amount: payment.amount,
              destination: payment.destination,
            },
          });
          return;
        }

        patchMessage(paymentPendingId, {
          content: "Payment sent. Logging to Soroban — approve if prompted.",
          status: "pending",
          txHash: result.hash,
          explorerUrl: result.explorerUrl,
          amount: payment.amount,
          destination: payment.destination,
          card: {
            kind: "payment",
            amount: payment.amount,
            destination: payment.destination,
          },
        });

        try {
          const contractTx = await logPaymentOnContract(
            wallet.address,
            payment.destination,
            payment.amount,
            result.hash,
            wallet.signTransaction
          );

          patchMessage(paymentPendingId, {
            content: "Payment sent and logged on-chain.",
            status: "success",
            txHash: result.hash,
            explorerUrl: result.explorerUrl,
            contractTxHash: contractTx.hash,
            contractExplorerUrl: contractTx.explorerUrl,
            amount: payment.amount,
            destination: payment.destination,
            card: {
              kind: "payment",
              amount: payment.amount,
              destination: payment.destination,
            },
          });
        } catch (error) {
          patchMessage(paymentPendingId, {
            content: `Payment sent on Stellar, but contract log failed: ${formatWalletError(error)}`,
            status: "success",
            txHash: result.hash,
            explorerUrl: result.explorerUrl,
            amount: payment.amount,
            destination: payment.destination,
            card: {
              kind: "payment",
              amount: payment.amount,
              destination: payment.destination,
            },
          });
        }
      } catch (error) {
        patchMessage(paymentPendingId, {
          content: formatWalletError(error),
          status: "error",
          card: undefined,
        });
      }
      return;
    }

    const sendHint = explainSendCommandFailure(rawInput);
    if (sendHint) {
      addMessage({ role: "bot", content: sendHint, status: "error" });
      return;
    }

    const swapHint = explainSwapCommandFailure(rawInput);
    if (swapHint) {
      addMessage({ role: "bot", content: swapHint, status: "error" });
      return;
    }

    const escrowHint = explainEscrowCommandFailure(rawInput);
    if (escrowHint) {
      addMessage({ role: "bot", content: escrowHint, status: "error" });
      return;
    }

    addMessage({
      role: "bot",
      content: "Didn't catch that. Type `help` for all commands, or try:\n`send 10 to G...`\n`swap 10 xlm to usdc`\n`escrow 10 to G...`",
      status: "info",
    });
  };

  const runCommand = async (userInput: string) => {
    if (!wallet.isConnected || !userInput.trim() || isProcessing) return;

    addMessage({ role: "user", content: userInput.trim() });
    setIsProcessing(true);

    try {
      await processCommand(userInput);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    const userInput = input.trim();
    if (!userInput) return;
    setInput("");
    await runCommand(userInput);
  };

  const handleQuickCommand = async (command: string) => {
    setInput("");
    await runCommand(command);
  };

  const handleClearChat = () => {
    pendingSwap.current = null;
    setMessages([
      createMessage({
        role: "bot",
        content: WELCOME_MESSAGE,
        status: "info",
      }),
    ]);
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <WalletHeader
        address={wallet.address}
        balance={wallet.balance}
        isConnecting={wallet.isConnecting}
        isLoadingBalance={wallet.isLoadingBalance}
        isConnected={wallet.isConnected}
        theme={theme}
        onSetTheme={setTheme}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onClearChat={handleClearChat}
      />

      <ChatWindow
        className="min-h-0 flex-1"
        messages={messages}
        isProcessing={isProcessing}
        isConnected={wallet.isConnected}
        isConnecting={wallet.isConnecting}
        connectError={connectError}
        onDismissConnectError={() => setConnectError(null)}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onQuickCommand={handleQuickCommand}
        onConnect={handleConnect}
      />
    </div>
  );
}

export default App;
