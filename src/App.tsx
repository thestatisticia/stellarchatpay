import { useCallback, useEffect, useState } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { WalletHeader } from "./components/WalletHeader";
import { useTheme } from "./hooks/useTheme";
import { useWallet } from "./hooks/useWallet";
import {
  HELP_MESSAGE,
  WELCOME_MESSAGE,
  createMessage,
  parseBalanceCommand,
  parseFundCommand,
  parseSendCommand,
  type ChatMessage,
} from "./lib/chat";
import {
  fetchAccountBalance,
  fundTestnetAccount,
  isValidStellarAddress,
  sendXlmPayment,
  getAccountExplorerUrl,
} from "./lib/stellar";

function App() {
  const wallet = useWallet();
  const { theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, createMessage(message)]);
  }, []);

  useEffect(() => {
    addMessage({
      role: "bot",
      content: WELCOME_MESSAGE,
      status: "info",
    });
  }, [addMessage]);

  const handleConnect = async () => {
    try {
      const address = await wallet.connect();
      addMessage({ role: "system", content: "Wallet connected" });
      addMessage({
        role: "bot",
        content: `You're live on testnet as \`${address.slice(0, 8)}…${address.slice(-6)}\`.\n\nNew account? Type \`fund\` first. Then try \`balance\` or send a payment.`,
        status: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      addMessage({
        role: "bot",
        content: `Couldn't connect: ${message}`,
        status: "error",
      });
    }
  };

  const handleDisconnect = () => {
    wallet.disconnect();
    addMessage({ role: "system", content: "Wallet disconnected" });
    addMessage({
      role: "bot",
      content: "Disconnected. Hit **Connect** when you're ready to chat again.",
      status: "info",
    });
  };

  const processCommand = async (rawInput: string) => {
    const command = rawInput.trim().toLowerCase();

    if (command === "help") {
      addMessage({ role: "bot", content: HELP_MESSAGE, status: "info" });
      return;
    }

    if (command === "balance") {
      if (!wallet.address) return;
      try {
        const balance = await wallet.refreshBalance(wallet.address);
        addMessage({
          role: "bot",
          content: `You've got **${balance} XLM** on testnet.`,
          status: "success",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Balance fetch failed";
        addMessage({
          role: "bot",
          content: `Couldn't fetch balance: ${message}`,
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
        const message = error instanceof Error ? error.message : "Balance fetch failed";
        addMessage({
          role: "bot",
          content: `Couldn't fetch balance: ${message}`,
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
        const message = error instanceof Error ? error.message : "Funding failed";
        addMessage({
          role: "bot",
          content: message,
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
        const balance = wallet.balance ?? (await wallet.refreshBalance(wallet.address));

        addMessage({
          role: "bot",
          content:
            result.status === "already_funded"
              ? `${result.message}\n\nYour balance is **${balance} XLM**.`
              : `${result.message}\n\nYour balance is now **${balance} XLM**.`,
          status: result.status === "already_funded" ? "info" : "success",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Funding failed";
        addMessage({
          role: "bot",
          content: message,
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

      addMessage({
        role: "bot",
        content: `Sending **${payment.amount} XLM** → \`${payment.destination.slice(0, 8)}…${payment.destination.slice(-6)}\`\n\nFreighter will ask you to approve this site and the transaction.`,
        status: "pending",
      });

      try {
        const result = await sendXlmPayment(
          wallet.address,
          payment.destination,
          payment.amount
        );

        await wallet.refreshBalance(wallet.address);

        addMessage({
          role: "bot",
          content: "Payment went through.",
          status: "success",
          txHash: result.hash,
          explorerUrl: result.explorerUrl,
          amount: payment.amount,
          destination: payment.destination,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Transaction failed";
        addMessage({
          role: "bot",
          content: `Transaction failed: ${message}`,
          status: "error",
        });
      }
      return;
    }

    addMessage({
      role: "bot",
      content:
        "Didn't catch that. Try `help`, or:\n`send 10 to G...`",
      status: "error",
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

  return (
    <div className="app-shell">
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
      />

      <ChatWindow
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
