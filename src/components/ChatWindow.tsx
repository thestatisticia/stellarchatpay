import { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/chat";
import { BotAvatar } from "./BotAvatar";
import { ChatBubble } from "./ChatBubble";
import { SuggestionLinks } from "./SuggestionLinks";

interface ChatWindowProps {
  className?: string;
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

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChatWindow({
  className = "",
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

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const isHeroMode = userMessageCount === 0;

  useEffect(() => {
    if (!isHeroMode) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, isHeroMode]);

  useEffect(() => {
    if (isConnected) inputRef.current?.focus();
  }, [isConnected]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isProcessing || !isConnected) return;
    onSubmit();
  };

  const inputDisabled = !isConnected || isProcessing;

  const renderInput = (variant: "hero" | "chat") => (
    <form onSubmit={handleSubmit} className={variant === "hero" ? "hero-input-form" : "chat-input-form"}>
      <div className={`input-pill ${variant === "hero" ? "input-pill-hero" : "input-pill-chat"}`}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={isConnected ? "Ask me anything…" : "Connect wallet to begin"}
          disabled={inputDisabled}
          className="input-pill-field"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={inputDisabled || !input.trim()}
          className="input-pill-send"
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );

  if (!isConnected) {
    return (
      <main className={`chat-shell ${className}`}>
        <div className="hero-layout">
          <h1 className="hero-title">What can I help with?</h1>
          <p className="hero-subtitle">
            Connect a Stellar testnet wallet to send payments, swap assets, and log activity on-chain.
          </p>

          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            className="hero-connect-btn"
          >
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>

          <p className="hero-wallet-links">
            Need a wallet?{" "}
            <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer">
              Freighter
            </a>
            {" · "}
            <a href="https://albedo.link" target="_blank" rel="noopener noreferrer">
              Albedo
            </a>
            {" · "}
            <a href="https://xbull.app" target="_blank" rel="noopener noreferrer">
              xBull
            </a>
          </p>

          <div className="hero-sections">
            <section className="hero-section">
              <h2 className="hero-section-title">
                <WalletSectionIcon />
                Wallet
              </h2>
              <p className="hero-section-copy">
                Freighter, Albedo, or xBull on Stellar testnet. Fund with Friendbot, then pay or swap through chat.
              </p>
            </section>
            <section className="hero-section">
              <h2 className="hero-section-title">
                <SuggestionSectionIcon />
                Suggestions for you
              </h2>
              <SuggestionLinks disabled variant="hero" onSelect={() => undefined} />
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (isHeroMode) {
    return (
      <main className={`chat-shell ${className}`}>
        <div className="hero-layout">
          <h1 className="hero-title">What can I help with?</h1>

          {renderInput("hero")}

          <SuggestionLinks disabled={isProcessing} onSelect={onQuickCommand} variant="hero" />

          <div className="hero-sections">
            <section className="hero-section">
              <h2 className="hero-section-title">
                <WalletSectionIcon />
                Wallet
              </h2>
              <p className="hero-section-copy">
                Type <code className="code-inline">balance</code>,{" "}
                <code className="code-inline">fund</code>, or{" "}
                <code className="code-inline">send 10 to G…</code> to manage testnet XLM.
              </p>
            </section>
            <section className="hero-section">
              <h2 className="hero-section-title">
                <SuggestionSectionIcon />
                Commands
              </h2>
              <p className="hero-section-copy">
                Swap with <code className="code-inline">swap 10 xlm to usdc</code>, check{" "}
                <code className="code-inline">activity</code>, or type <code className="code-inline">help</code>.
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`chat-shell chat-shell-active ${className}`}>
      <div className="chat-messages scrollbar-thin">
        {messages.map((message, index) => (
          <ChatBubble key={message.id} message={message} index={index} />
        ))}

        {isProcessing && (
          <div className="flex animate-fade-in gap-3 px-1">
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

      <div className="chat-input-area">
        {renderInput("chat")}
      </div>
    </main>
  );
}

function WalletSectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-9z" />
      <path strokeLinecap="round" d="M16 12.5h.01" />
    </svg>
  );
}

function SuggestionSectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}
