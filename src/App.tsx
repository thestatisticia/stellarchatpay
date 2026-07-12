import { useCallback, useEffect, useRef, useState } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { WalletHeader } from "./components/WalletHeader";
import { usePaymentEvents } from "./hooks/usePaymentEvents";
import { useTheme } from "./hooks/useTheme";
import { useWallet } from "./hooks/useWallet";
import { isContractConfigured } from "./config/contract";
import {
  HELP_MESSAGE,
  WELCOME_MESSAGE,
  createMessage,
  explainSendCommandFailure,
  explainSwapCommandFailure,
  parseBalanceCommand,
  parseConfirmCommand,
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
  assertSufficientBalance,
  formatWalletError,
} from "./lib/errors";
import {
  executeSwap,
  createUsdcTrustline,
  fetchAccountBalance,
  fetchAssetBalance,
  fetchXlmBalance,
  formatSwapQuoteMessage,
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingSwap = useRef<SwapQuote | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, createMessage(message)]);
  }, []);

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

  useEffect(() => {
    addMessage({
      role: "bot",
      content: WELCOME_MESSAGE,
      status: "info",
    });
  }, [addMessage]);

  const handleConnect = async () => {
    try {
      const { address, walletName, accountExists } = await wallet.connect();
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
      if (!message.toLowerCase().includes("cancelled")) {
        addMessage({
          role: "bot",
          content: message,
          status: "error",
        });
      }
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
      try {
        const balance = await fetchAssetBalance(wallet.address, "usdc");
        const trusted = await hasUsdcTrustline(wallet.address);
        addMessage({
          role: "bot",
          content: trusted
            ? `You've got **${balance} USDC** on testnet.`
            : `No USDC yet. Your first \`swap … to usdc\` adds a trustline automatically.`,
          status: trusted ? "success" : "info",
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

      addMessage({
        role: "bot",
        content: `Executing swap — **${quote.sendAmount} ${quote.fromLabel}** → **≈ ${quote.receiveAmount} ${quote.toLabel}**.\n\nApprove in your wallet when prompted.`,
        status: "pending",
      });

      try {
        const result = await executeSwap(
          wallet.address,
          quote,
          wallet.signTransaction
        );

        pendingSwap.current = null;
        await wallet.refreshBalance(wallet.address);

        addMessage({
          role: "bot",
          content: `Swap complete — sent **${result.sendAmount} ${result.fromAsset}**, received **${result.receiveAmount} ${result.toAsset}**.`,
          status: "success",
          txHash: result.hash,
          explorerUrl: result.explorerUrl,
          amount: result.receiveAmount,
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

      addMessage({
        role: "bot",
        content: "Fetching swap quote from the testnet DEX…",
        status: "pending",
      });

      try {
        const quote = await getSwapQuote(
          wallet.address,
          swap.from,
          swap.amount,
          swap.to
        );

        pendingSwap.current = quote;

        addMessage({
          role: "bot",
          content: formatSwapQuoteMessage(quote),
          status: "info",
        });
      } catch (error) {
        pendingSwap.current = null;
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
        });
      }
      return;
    }

    if (command === "balance") {
      if (!wallet.address) return;
      try {
        const { balance } = await wallet.refreshBalance(wallet.address);
        addMessage({
          role: "bot",
          content: `You've got **${balance} XLM** on testnet.`,
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

      try {
        const { balance, exists } = await fetchAccountBalance(otherAddress);
        const short = `${otherAddress.slice(0, 8)}…${otherAddress.slice(-6)}`;

        if (!exists) {
          addMessage({
            role: "bot",
            content: `Account \`${short}\` was not found on testnet. It may be unfunded or the address is wrong.`,
            status: "error",
          });
          return;
        }

        const isOwnWallet = wallet.address === otherAddress;
        addMessage({
          role: "bot",
          content: isOwnWallet
            ? `Your balance is **${balance} XLM** on testnet.`
            : `Balance for \`${short}\` is **${balance} XLM** on testnet.`,
          status: "success",
          explorerUrl: getAccountExplorerUrl(otherAddress),
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

      addMessage({
        role: "bot",
        content: `Sending **${payment.amount} XLM** → \`${payment.destination.slice(0, 8)}…${payment.destination.slice(-6)}\`\n\nApprove in your wallet when prompted.`,
        status: "pending",
      });

      try {
        const result = await sendXlmPayment(
          wallet.address,
          payment.destination,
          payment.amount,
          wallet.signTransaction
        );

        await wallet.refreshBalance(wallet.address);

        addMessage({
          role: "bot",
          content: "Payment went through on Stellar.",
          status: "success",
          txHash: result.hash,
          explorerUrl: result.explorerUrl,
          amount: payment.amount,
          destination: payment.destination,
        });

        if (isContractConfigured()) {
          addMessage({
            role: "bot",
            content: "Logging payment to Soroban contract…",
            status: "pending",
          });

          try {
            const contractTx = await logPaymentOnContract(
              wallet.address,
              payment.destination,
              payment.amount,
              result.hash,
              wallet.signTransaction
            );

            addMessage({
              role: "bot",
              content: "Payment logged on-chain. Activity feed updated.",
              status: "success",
              txHash: contractTx.hash,
              explorerUrl: contractTx.explorerUrl,
            });
          } catch (error) {
            addMessage({
              role: "bot",
              content: `Payment sent, but contract log failed: ${formatWalletError(error)}`,
              status: "error",
            });
          }
        }
      } catch (error) {
        addMessage({
          role: "bot",
          content: formatWalletError(error),
          status: "error",
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

    addMessage({
      role: "bot",
      content: "Didn't catch that. Type `help` for all commands, or try:\n`send 10 to G...`\n`swap 10 xlm to usdc`",
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
    setMessages([]);
    addMessage({
      role: "bot",
      content: WELCOME_MESSAGE,
      status: "info",
    });
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
