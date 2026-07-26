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
  highlightKey?: string | null;
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
  highlightKey = null,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const isFreshSession = isConnected && userMessageCount === 0;
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
    if (!isFreshSession) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isProcessing, isFreshSession]);

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

  const renderComposer = () => (
    <div className="chat-composer">
      {isConnected && !suggestions.length && (
        <SuggestionLinks
          disabled={isProcessing}
          onSelect={onQuickCommand}
          variant="chips"
          highlightKey={highlightKey}
        />
      )}
      <form onSubmit={handleSubmit} className="chat-input-form">
        {renderAutocomplete()}
        <div className="input-pill input-pill-chat">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Message Orbit…" : "Connect wallet to message Orbit"}
            disabled={inputDisabled}
            className="input-pill-field"
            autoComplete="off"
            spellCheck={false}
          />
          {isConnected && (
            <span className="input-wallet-hint" title="Wallet connected">
              Connected
            </span>
          )}
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
    </div>
  );

  if (!isConnected) {
    return (
      <main className={`chat-shell chat-shell-landing ${className}`}>
        <div className="landing-layout">
          <div className="landing-orbit" aria-hidden />

          <p className="landing-badge">
            <span className="landing-badge-dot" />
            Live on Stellar testnet
          </p>

          <h1 className="landing-title">
            Banking on Stellar,
            <br />
            through conversation.
          </h1>
          <p className="landing-sub">
            Send payments, swap assets, and create escrow — all from a single chat.
          </p>

          <div className="landing-cta-row">
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="hero-connect-btn"
            >
              {isConnecting ? "Launching…" : "Launch app"}
            </button>
          </div>

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

          <div className="landing-prompts">
            <p className="landing-prompts-label">Try asking things like</p>
            <SuggestionLinks disabled variant="examples" onSelect={() => undefined} />
          </div>
        </div>

        <div className="chat-input-area chat-input-area-landing">{renderComposer()}</div>
      </main>
    );
  }

  return (
    <main className={`chat-shell chat-shell-active ${className}`}>
      <div className="chat-messages">
        {isFreshSession ? (
          <div className="chat-fresh">
            <p className="landing-badge chat-fresh-badge">
              <span className="landing-badge-dot" />
              Wallet connected
            </p>
            <h1 className="chat-fresh-title">What can I help with?</h1>
            <p className="chat-fresh-sub">Try asking things like:</p>
            <SuggestionLinks
              disabled={isProcessing}
              onSelect={onQuickCommand}
              variant="examples"
            />
          </div>
        ) : (
          <ChatMessageList messages={messages} onAction={onQuickCommand} />
        )}

        {showTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area chat-input-area-sticky">{renderComposer()}</div>
    </main>
  );
}
