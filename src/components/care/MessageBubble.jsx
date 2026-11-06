import { CircleAlert, RotateCcw, Sparkles } from 'lucide-react';
import RichText from './RichText.jsx';

/* All message text is rendered as plain text nodes (React escapes it): model output is never treated as HTML. */
export default function MessageBubble({ message, onRetry, disabled, onNavigate }) {
  const isUser = message.role === 'user';
  const failed = message.status === 'failed';

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Avatar />}
      <div className="max-w-[84%]">
        {!isUser && <p className="mb-1 ml-1 text-[11px] font-semibold tracking-wide text-[#6b6254]">Aviana Care</p>}
        <div
          className={`rounded-2xl px-3.5 py-2.5 ${
            isUser
              ? `rounded-br-md bg-gradient-to-br from-[#8a6a38] to-[#7d5f2e] text-white ${message.status === 'sending' ? 'opacity-80' : ''}`
              : 'rounded-bl-md border border-[#e5d4b9] bg-[#f3ece0] text-[#2f2a22]'
          } ${failed ? 'ring-2 ring-[#9b2c2c]/60' : ''}`}
        >
          {isUser ? <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{message.text}</p> : <RichText text={message.text} onNavigate={onNavigate} />}
        </div>
        {failed && (
          <div className="mt-1 flex items-center justify-end gap-2 text-[12px] text-[#9b2c2c]">
            <CircleAlert size={13} aria-hidden="true" />
            <span>Not sent</span>
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              disabled={disabled}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[#9b2c2c]/40 px-2.5 font-semibold hover:bg-[#9b2c2c]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7d5f2e] disabled:opacity-50"
            >
              <RotateCcw size={12} aria-hidden="true" /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Avatar({ size = 28 }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d9bd87] to-[#b08d57] text-[#2f2a22]">
      <Sparkles size={Math.round(size * 0.5)} />
    </span>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-end justify-start gap-2" role="status" aria-label="Aviana Care is typing">
      <Avatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-[#e5d4b9] bg-[#f3ece0] px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="care-dot h-1.5 w-1.5 rounded-full bg-[#7d5f2e]" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </div>
    </div>
  );
}
