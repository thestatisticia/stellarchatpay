import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCommandSuggestions,
  shouldFillSuggestionOnly,
  type ChatMessage,
} from "../lib/chat";
import { ChatMessageList, TypingIndicator } from "./ChatMessageList";
import { SuggestionLinks } from "./SuggestionLinks";

interface ChatWindowProps {
  className?: string;
  messages: ChatMessage[];
  isProcessing: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  connectError?: string | null;
  onDismissConnectError?: () => void;
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
  connectError = null,
  onDismissConnectError,
  input,
  onInputChange,
  onSubmit,
  onQuickCommand,
  onConnect,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const isHeroMode = userMessageCount === 0;
  const hasPendingBot = messages.some((m) => m.role === "bot" && m.status === "pending");
  const showTyping = isProcessing && !hasPendingBot;

  const suggestions = useMemo(
    () => (isConnected && !isProcessing ? getCommandSuggestions(input) : []),
    [input, isConnected, isProcessing]
  );

  useEffect(() => {
    setActiveSuggestion(0);
  }, [input]);

  useEffect(() => {
    if (!isHeroMode) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, isHeroMode]);

  useEffect(() => {
    if (isConnected) inputRef.current?.focus();
  }, [isConnected]);

  const applySuggestion = (command: string) => {
    if (shouldFillSuggestionOnly(command)) {
      onInputChange(command.replace(/\.\.\.$/, ""));
      inputRef.current?.focus();
      return;
    }
    onQuickCommand(command);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isProcessing || !isConnected) return;
    onSubmit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      applySuggestion(suggestions[activeSuggestion]?.command ?? suggestions[0].command);
    }
  };

  const inputDisabled = !isConnected || isProcessing;

  const renderAutocomplete = () => {
    if (!suggestions.length) return null;

    return (
      <ul className="command-autocomplete" role="listbox" aria-label="Command suggestions">
        {suggestions.map((item, index) => (
          <li key={item.command}>
            <button
              type="button"
              role="option"
              aria-selected={index === activeSuggestion}
              className={`command-autocomplete-item ${
                index === activeSuggestion ? "command-autocomplete-item-active" : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                applySuggestion(item.command);
              }}
            >
              <span className="command-autocomplete-command">{item.command}</span>
              <span className="command-autocomplete-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const renderInput = (variant: "hero" | "chat") => (
    <form onSubmit={handleSubmit} className={variant === "hero" ? "hero-input-form" : "chat-input-form"}>
      {variant === "chat" && renderAutocomplete()}
      <div className={`input-pill ${variant === "hero" ? "input-pill-hero" : "input-pill-chat"}`}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
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
      {variant === "hero" && renderAutocomplete()}
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

          {connectError && (
            <div className="connect-error-banner" role="alert">
              <div className="connect-error-banner-body">
                <span className="status-badge badge-error">Failed</span>
                <p>{connectError}</p>
              </div>
              {onDismissConnectError && (
                <button
                  type="button"
                  className="connect-error-dismiss"
                  onClick={onDismissConnectError}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              )}
            </div>
          )}

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

          {!suggestions.length && (
            <SuggestionLinks disabled={isProcessing} onSelect={onQuickCommand} variant="hero" />
          )}

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
                <code className="code-inline">activity</code>, or type{" "}
                <code className="code-inline">help</code>.
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
        <ChatMessageList messages={messages} onAction={onQuickCommand} />

        {showTyping && <TypingIndicator />}

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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-9z"
      />
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
