import { BotAvatar } from "./BotAvatar";
import type { ChatMessage, MessageCard } from "../lib/chat";
import { truncateAddress } from "../lib/stellar";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
  variant?: "default" | "turn-user" | "turn-bot";
  showAvatar?: boolean;
  onAction?: (command: string) => void;
}

function shortenLongTokens(text: string): string {
  return text
    .replace(/\b(G[A-Z2-7]{55})\b/g, (_, addr: string) => truncateAddress(addr, 6))
    .replace(/\b([0-9a-f]{64})\b/gi, (_, hash: string) => `${hash.slice(0, 8)}…${hash.slice(-8)}`);
}

function formatContent(content: string): React.ReactNode {
  const shortened = shortenLongTokens(content);
  const parts = shortened.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="code-inline">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold" style={{ color: "var(--text)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function ExternalIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function CardLinks({
  explorerUrl,
  contractExplorerUrl,
  status,
}: {
  explorerUrl?: string;
  contractExplorerUrl?: string;
  status: ChatMessage["status"];
}) {
  if (status !== "success" || (!explorerUrl && !contractExplorerUrl)) return null;

  return (
    <div className="tx-card-links">
      {explorerUrl && (
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="tx-card-link">
          View on explorer
          <ExternalIcon />
        </a>
      )}
      {contractExplorerUrl && (
        <a
          href={contractExplorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tx-card-link"
        >
          View contract log
          <ExternalIcon />
        </a>
      )}
    </div>
  );
}

function ResultCard({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction?: (command: string) => void;
}) {
  const status = message.status;
  const card = message.card ?? inferLegacyPaymentCard(message);

  if (!card) {
    if (message.txHash && (status === "success" || status === "pending")) {
      return (
        <div className={`result-card mt-3 ${status === "pending" ? "result-card-pending" : ""}`}>
          <div className="result-card-header">
            <p className="result-card-kicker">
              {status === "pending" ? "Transaction in progress" : "Transaction confirmed"}
            </p>
          </div>
          <div className="result-card-body">
            <div className="tx-row">
              <span className="result-card-label">Hash</span>
              <span className="tx-mono" title={message.txHash}>
                {message.txHash.slice(0, 8)}…{message.txHash.slice(-8)}
              </span>
            </div>
          </div>
          <CardLinks
            explorerUrl={message.explorerUrl}
            contractExplorerUrl={message.contractExplorerUrl}
            status={status}
          />
        </div>
      );
    }
    return null;
  }

  const pending = status === "pending";
  const toneClass = pending ? "result-card-pending" : "";

  if (card.kind === "balance") {
    return (
      <div className={`result-card mt-3 ${toneClass}`}>
        <div className="result-card-header">
          <p className="result-card-kicker">Wallet balance</p>
        </div>
        <div className="result-card-body">
          <div className="result-card-hero">
            <span className="result-card-asset">{card.asset}</span>
            <span className="result-card-balance tabular-nums">{formatCardBalance(card.balance)}</span>
          </div>
          {card.address && (
            <div className="tx-row">
              <span className="result-card-label">Account</span>
              <span className="tx-mono" title={card.address}>
                {truncateAddress(card.address, 6)}
              </span>
            </div>
          )}
          <div className="tx-row">
            <span className="result-card-label">Updated</span>
            <span className="result-card-meta">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        {message.explorerUrl && status === "success" && (
          <div className="tx-card-links">
            <a
              href={message.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-card-link"
            >
              View account
              <ExternalIcon />
            </a>
          </div>
        )}
      </div>
    );
  }

  if (card.kind === "swapQuote") {
    return (
      <div className={`result-card mt-3 ${toneClass}`}>
        <div className="result-card-header">
          <p className="result-card-kicker">Swap preview</p>
        </div>
        <div className="result-card-body">
          <div className="result-card-swap-stack">
            <p className="result-card-swap-line tabular-nums">
              {card.sendAmount} {card.fromLabel}
            </p>
            <p className="result-card-swap-arrow" aria-hidden>
              ↓
            </p>
            <p className="result-card-swap-line result-card-swap-receive tabular-nums">
              ≈ {card.receiveAmount} {card.toLabel}
            </p>
          </div>
          <div className="tx-row">
            <span className="result-card-label">Rate</span>
            <span className="result-card-meta tabular-nums">
              ≈ {card.rate} {card.toLabel} / {card.fromLabel}
            </span>
          </div>
          {card.needsTrustline && (
            <p className="result-card-note">USDC trustline will be added in the same transaction.</p>
          )}
        </div>
        {message.actionCommand && onAction && (
          <div className="result-card-actions">
            <button
              type="button"
              className="result-card-action-btn"
              onClick={() => onAction(message.actionCommand!)}
            >
              {message.actionLabel ?? "Confirm"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (card.kind === "swapResult") {
    return (
      <div className={`result-card mt-3 ${toneClass}`}>
        <div className="result-card-header">
          <p className="result-card-kicker">{pending ? "Swap in progress" : "Swap confirmed"}</p>
        </div>
        <div className="result-card-body">
          <div className="result-card-swap-stack">
            <p className="result-card-swap-line tabular-nums">
              {card.sendAmount} {card.fromLabel}
            </p>
            <p className="result-card-swap-arrow" aria-hidden>
              ↓
            </p>
            <p className="result-card-swap-line result-card-swap-receive tabular-nums">
              {card.receiveAmount} {card.toLabel}
            </p>
          </div>
        </div>
        <CardLinks explorerUrl={message.explorerUrl} status={status} />
      </div>
    );
  }

  if (card.kind === "escrow") {
    const title =
      card.action === "create"
        ? pending
          ? "Escrow locking"
          : "Escrow created"
        : card.action === "release"
          ? pending
            ? "Escrow releasing"
            : "Escrow released"
          : card.action === "refund"
            ? pending
              ? "Escrow refunding"
              : "Escrow refunded"
            : "Escrow status";

    return (
      <div className={`result-card mt-3 ${toneClass}`}>
        <div className="result-card-header">
          <p className="result-card-kicker">{title}</p>
        </div>
        <div className="result-card-body">
          {card.id != null && (
            <div className="tx-row">
              <span className="result-card-label">Escrow</span>
              <span className="font-medium" style={{ color: "var(--text)" }}>
                #{card.id}
              </span>
            </div>
          )}
          {card.escrowStatus && (
            <div className="tx-row">
              <span className="result-card-label">Status</span>
              <span className="font-medium" style={{ color: "var(--text)" }}>
                {card.escrowStatus}
              </span>
            </div>
          )}
          {card.amount && (
            <div className="tx-row">
              <span className="result-card-label">Amount</span>
              <span className="font-medium tabular-nums" style={{ color: "var(--text)" }}>
                {card.amount} XLM
              </span>
            </div>
          )}
          {card.from && (
            <div className="tx-row">
              <span className="result-card-label">From</span>
              <span className="tx-mono" title={card.from}>
                {truncateAddress(card.from, 6)}
              </span>
            </div>
          )}
          {card.destination && (
            <div className="tx-row">
              <span className="result-card-label">Recipient</span>
              <span className="tx-mono" title={card.destination}>
                {truncateAddress(card.destination, 6)}
              </span>
            </div>
          )}
          {message.txHash && (
            <div className="tx-row">
              <span className="result-card-label">Tx</span>
              <span className="tx-mono" title={message.txHash}>
                {message.txHash.slice(0, 8)}…{message.txHash.slice(-8)}
              </span>
            </div>
          )}
        </div>
        <CardLinks explorerUrl={message.explorerUrl} status={status} />
      </div>
    );
  }

  // payment
  return (
    <div className={`result-card mt-3 ${toneClass}`}>
      <div className="result-card-header">
        <p className="result-card-kicker">{pending ? "Payment in progress" : "Payment confirmed"}</p>
      </div>
      <div className="result-card-body">
        <div className="tx-row">
          <span className="result-card-label">Amount</span>
          <span className="font-medium tabular-nums" style={{ color: "var(--text)" }}>
            {card.amount} {card.asset ?? "XLM"}
          </span>
        </div>
        <div className="tx-row">
          <span className="result-card-label">Recipient</span>
          <span className="tx-mono" title={card.destination}>
            {truncateAddress(card.destination, 6)}
          </span>
        </div>
        {message.txHash && (
          <div className="tx-row">
            <span className="result-card-label">Payment</span>
            <span className="tx-mono" title={message.txHash}>
              {message.txHash.slice(0, 8)}…{message.txHash.slice(-8)}
            </span>
          </div>
        )}
        {message.contractTxHash && (
          <div className="tx-row">
            <span className="result-card-label">Contract log</span>
            <span className="tx-mono" title={message.contractTxHash}>
              {message.contractTxHash.slice(0, 8)}…{message.contractTxHash.slice(-8)}
            </span>
          </div>
        )}
      </div>
      <CardLinks
        explorerUrl={message.explorerUrl}
        contractExplorerUrl={message.contractExplorerUrl}
        status={status}
      />
    </div>
  );
}

function inferLegacyPaymentCard(message: ChatMessage): MessageCard | null {
  if (!message.amount || !message.destination) return null;
  if (message.status !== "success" && message.status !== "pending") return null;
  if (message.status === "pending" && !message.txHash) return null;
  return {
    kind: "payment",
    amount: message.amount,
    destination: message.destination,
  };
}

function formatCardBalance(balance: string): string {
  const value = Number.parseFloat(balance);
  if (Number.isNaN(value)) return balance;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

function StatusBadge({ status }: { status: ChatMessage["status"] }) {
  if (!status || status === "info") return null;

  const className = {
    success: "badge-success",
    error: "badge-error",
    pending: "badge-pending",
  }[status];

  const label = {
    success: "Success",
    error: "Failed",
    pending: "Processing",
  }[status];

  return (
    <span className={`status-badge mb-2 ${className}`}>
      {status === "pending" && <span className="status-dot" />}
      {label}
    </span>
  );
}

export function ChatBubble({
  message,
  index,
  variant = "default",
  showAvatar = true,
  onAction,
}: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex animate-fade-in justify-center py-1" style={{ animationDelay: `${index * 30}ms` }}>
        <p className="system-pill">{message.content}</p>
      </div>
    );
  }

  const bubble = (
    <div className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-bot"}`}>
      {!isUser && <StatusBadge status={message.status} />}
      {message.content.trim() && (
        <div className="chat-bubble-text">{formatContent(message.content)}</div>
      )}

      {!isUser && <ResultCard message={message} onAction={onAction} />}

      {message.explorerUrl && !message.txHash && !message.card && message.status === "success" && (
        <a href={message.explorerUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-link">
          View account on Stellar Expert →
        </a>
      )}

      {message.txHash && message.status === "error" && message.explorerUrl && (
        <a href={message.explorerUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-link">
          View details →
        </a>
      )}

      {variant === "default" && (
        <p className="chat-time">{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      )}
    </div>
  );

  if (variant === "turn-user") {
    return (
      <div className="chat-turn-user animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
        {bubble}
      </div>
    );
  }

  if (variant === "turn-bot") {
    return (
      <div
        className="chat-turn-bot flex animate-fade-up gap-2.5"
        style={{ animationDelay: `${index * 30}ms` }}
      >
        {showAvatar ? <BotAvatar /> : <div className="w-9 shrink-0" aria-hidden />}
        {bubble}
      </div>
    );
  }

  return (
    <div
      className={`flex animate-fade-up gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {!isUser && showAvatar && <BotAvatar />}

      {bubble}
    </div>
  );
}
