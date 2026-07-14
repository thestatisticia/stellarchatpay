import type { ChatMessage } from "../lib/chat";
import { BotAvatar } from "./BotAvatar";
import { ChatBubble } from "./ChatBubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  onAction?: (command: string) => void;
}

type MessageBlock =
  | { kind: "system"; message: ChatMessage }
  | { kind: "standalone"; message: ChatMessage }
  | { kind: "turn"; user: ChatMessage; replies: ChatMessage[] };

function buildBlocks(messages: ChatMessage[]): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let index = 0;

  while (index < messages.length) {
    const message = messages[index];

    if (message.role === "system") {
      blocks.push({ kind: "system", message });
      index += 1;
      continue;
    }

    if (message.role === "user") {
      const user = message;
      const replies: ChatMessage[] = [];
      index += 1;
      while (index < messages.length && messages[index].role === "bot") {
        replies.push(messages[index]);
        index += 1;
      }
      blocks.push({ kind: "turn", user, replies });
      continue;
    }

    blocks.push({ kind: "standalone", message });
    index += 1;
  }

  return blocks;
}

export function ChatMessageList({ messages, onAction }: ChatMessageListProps) {
  const blocks = buildBlocks(messages);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        if (block.kind === "system") {
          return (
            <ChatBubble
              key={block.message.id}
              message={block.message}
              index={blockIndex}
              onAction={onAction}
            />
          );
        }

        if (block.kind === "standalone") {
          return (
            <ChatBubble
              key={block.message.id}
              message={block.message}
              index={blockIndex}
              onAction={onAction}
            />
          );
        }

        return (
          <div key={block.user.id} className="chat-turn">
            <ChatBubble message={block.user} index={blockIndex} variant="turn-user" />
            {block.replies.map((reply, replyIndex) => (
              <ChatBubble
                key={reply.id}
                message={reply}
                index={blockIndex + replyIndex}
                variant="turn-bot"
                showAvatar={replyIndex === 0}
                onAction={onAction}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

interface TypingIndicatorProps {
  showAvatar?: boolean;
}

export function TypingIndicator({ showAvatar = true }: TypingIndicatorProps) {
  return (
    <div className="chat-turn-bot flex gap-2.5 px-1">
      {showAvatar ? <BotAvatar /> : <div className="w-9 shrink-0" aria-hidden />}
      <div className="chat-bubble chat-bubble-bot max-w-xs">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
          Preparing…
        </div>
      </div>
    </div>
  );
}
