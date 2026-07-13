import { BotAvatar } from "./BotAvatar";
import type { ChatMessage } from "../lib/chat";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
  variant?: "default" | "turn-user" | "turn-bot";
  showAvatar?: boolean;
}

function formatContent(content: string): React.ReactNode {
  const parts = content.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
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

function TransactionCard({
  amount,
  destination,
  hash,
  explorerUrl,
  status,
}: {
  amount?: string;
  destination?: string;
  hash?: string;
  explorerUrl?: string;
  status: ChatMessage["status"];
}) {
  if (!hash || status !== "success") return null;

  return (
    <div className="tx-card mt-3 overflow-hidden rounded-lg">
      <div className="tx-card-header px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider">Payment confirmed</p>
      </div>
      <div className="space-y-2 px-3 py-2.5 text-xs">
        {amount && (
          <div className="flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>Amount</span>
            <span className="font-medium tabular-nums" style={{ color: "var(--text)" }}>
              {amount} XLM
            </span>
          </div>
        )}
        {destination && (
          <div className="flex justify-between gap-4">
            <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
              Recipient
            </span>
            <span className="truncate font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
              {destination.slice(0, 10)}…{destination.slice(-8)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-muted)" }}>Hash</span>
          <span className="truncate font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {hash}
          </span>
        </div>
      </div>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tx-card-link flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium"
        >
          View on Stellar Expert
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
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
    <div className={`chat-bubble max-w-[min(92%,34rem)] ${isUser ? "chat-bubble-user" : "chat-bubble-bot"}`}>
      {!isUser && <StatusBadge status={message.status} />}
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{formatContent(message.content)}</div>

      <TransactionCard
        amount={message.amount}
        destination={message.destination}
        hash={message.txHash}
        explorerUrl={message.explorerUrl}
        status={message.status}
      />

      {message.explorerUrl && !message.txHash && message.status === "success" && (
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
