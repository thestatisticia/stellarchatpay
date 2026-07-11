import { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/chat";
import { BotAvatar } from "./BotAvatar";
import { ChatBubble } from "./ChatBubble";
import { QuickActions } from "./QuickActions";

interface ChatWindowProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onQuickCommand: (command: string) => void;
  onConnect: () => void;
}

export function ChatWindow({
  messages,
  isProcessing,
  isConnected,
  isConnecting,
  input,
  onInputChange,
  onSubmit,
  onQuickCommand,
  onConnect,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (isConnected) inputRef.current?.focus();
  }, [isConnected]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isProcessing || !isConnected) return;
    onSubmit();
  };

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-65px)] max-w-3xl flex-col px-4 py-4">
      {!isConnected && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className="connect-card pointer-events-auto w-full max-w-md animate-fade-up rounded-xl p-8">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Get started
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
              Connect your wallet
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Link Freighter on Stellar testnet to send payments, check balances, and manage XLM through chat commands.
            </p>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li className="flex items-center gap-2">
                <span className="connect-step">1</span>
                Install Freighter and switch to Testnet
              </li>
              <li className="flex items-center gap-2">
                <span className="connect-step">2</span>
                Connect below and type <code className="code-inline">fund</code> if needed
              </li>
              <li className="flex items-center gap-2">
                <span className="connect-step">3</span>
                Send with <code className="code-inline">send 10 to G...</code>
              </li>
            </ul>
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-primary mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              {isConnecting ? "Connecting…" : "Connect Freighter Wallet"}
            </button>
            <p className="mt-4 text-center text-xs" style={{ color: "var(--text-faint)" }}>
              No Freighter?{" "}
              <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer" className="text-link">
                Download extension
              </a>
            </p>
          </div>
        </div>
      )}

      <div className={`chat-panel scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4 transition ${!isConnected ? "is-locked" : ""}`}>
        {messages.map((message, index) => (
          <ChatBubble key={message.id} message={message} index={index} />
        ))}

        {isProcessing && (
          <div className="flex animate-fade-in gap-2.5">
            <BotAvatar />
            <div className="chat-bubble chat-bubble-bot max-w-xs">
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <span className="typing-dots">
                  <span />
                  <span />
                  <span />
                </span>
                Processing…
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {isConnected && (
        <div className="mt-3">
          <QuickActions disabled={isProcessing} onSelect={onQuickCommand} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3">
        <div className="input-shell flex items-center gap-2 rounded-lg px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={isConnected ? "Type a command…" : "Connect wallet to begin"}
            disabled={!isConnected || isProcessing}
            className="flex-1 bg-transparent text-sm focus:outline-none disabled:cursor-not-allowed"
            style={{ color: "var(--text)" }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!isConnected || isProcessing || !input.trim()}
            className="btn-primary rounded-md px-4 py-1.5 text-sm font-medium"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
