import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CircleAlert, Headset, Sparkles, SendHorizontal, Trash, X } from 'lucide-react';
import MessageBubble, { Avatar, TypingIndicator } from './MessageBubble';
import SupportTicketForm from './SupportTicketForm';
import { canSend } from './chatState';

const SUGGESTIONS = [
  'What services do you offer?',
  'How do I book a massage?',
  'Do you offer home service?',
  'Mujhe price list batao',
];
const MAX_CHARS = 1000;

export default function ChatPanel({ chat, user, onClose, inputRef, bottomOffsetClass }) {
  const { state, signedIn } = chat;
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const sendDisabled = !canSend(state, draft);
  const firstName = String(user?.fullName || '').trim().split(/\s+/)[0] || '';
  const last = state.messages[state.messages.length - 1];
  const showQuickActions = !state.sending && !state.supportOpen && last?.role === 'assistant';

  // Keep the newest message in view; respect reduced-motion preferences.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [state.messages.length, state.sending, state.supportOpen, state.ticket.status]);

  const submit = (text) => {
    if (chat.send(text)) setDraft('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!sendDisabled) submit(draft);
    }
  };

  const empty = state.messages.length === 0 && state.history !== 'loading';

  return (
    <section
      role="dialog"
      aria-label="Aviana Care chat"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      className={`fixed inset-x-2 z-[45] flex h-[min(640px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-3xl border border-[#e5d4b9] bg-[#fdfcf9] shadow-[0_24px_60px_-12px_rgba(48,41,32,0.35)] sm:inset-x-auto sm:right-5 sm:w-[400px] ${bottomOffsetClass}`}
    >
      <header className="flex items-center justify-between gap-3 bg-gradient-to-br from-[#302920] to-[#4a3f2e] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size={36} />
          <div className="min-w-0">
            <h2 className="font-display text-[17px] leading-tight">Aviana Care</h2>
            <p className="truncate text-[12px] text-[#eadfc9]">AI assistant · Aviana Spa</p>
            <p className="truncate text-[11px] text-[#d9ccb2]">
              {signedIn ? `Signed in${firstName ? ` as ${firstName}` : ''} · chat saved to your account` : 'Guest · this chat is not saved'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {state.messages.length > 0 && (
            <button type="button" onClick={chat.clear} disabled={state.sending} aria-label="Clear conversation" title="Clear conversation" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white disabled:opacity-50">
              <Trash size={17} aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close chat" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white">
            <X size={19} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
        <div className="space-y-3">
          {state.history === 'loading' && <p className="py-6 text-center text-[13px] text-[#6b6254]" role="status">Loading your conversation…</p>}
          {state.history === 'error' && (
            <div className="rounded-xl bg-[#f3ece0] px-3 py-2 text-[13px] text-[#2f2a22]">
              We couldn&apos;t load your earlier messages.{' '}
              <button type="button" onClick={chat.reloadHistory} className="font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[#7d5f2e]">Try again</button>
            </div>
          )}

          {empty && (
            <div className="rounded-2xl border border-[#e5d4b9] bg-[#f3ece0] p-4">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-[#2f2a22]"><Sparkles size={16} className="text-[#7d5f2e]" aria-hidden="true" /> {firstName ? `Hi ${firstName}, welcome to Aviana Spa` : 'Welcome to Aviana Spa'}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#514638]">
                I can help with our treatments, prices, add-ons and booking. For anything about your own booking or payment, I&apos;ll connect you with our team.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((question) => (
                  <button key={question} type="button" disabled={state.sending} onClick={() => submit(question)} className="min-h-10 rounded-full border border-[#c9b184] bg-white px-3 text-[13px] font-medium text-[#2f2a22] hover:bg-[#f8f2e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7d5f2e] disabled:opacity-50">
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.messages.map((message) => (
            <MessageBubble key={message.id} message={message} onRetry={chat.retry} disabled={state.sending} onNavigate={onClose} />
          ))}
          {showQuickActions && (
            <div className="flex flex-wrap gap-2 pl-9" aria-label="Quick actions">
              <Link to="/booking" onClick={onClose} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-gradient-to-br from-[#8a6a38] to-[#7d5f2e] px-3.5 text-[12px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a22]">
                <CalendarCheck size={13} aria-hidden="true" /> Book now
              </Link>
              <Link to="/services" onClick={onClose} className="inline-flex min-h-9 items-center rounded-full border border-[#c9b184] bg-white px-3.5 text-[12px] font-semibold text-[#2f2a22] hover:bg-[#f8f2e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7d5f2e]">
                View services
              </Link>
              <button type="button" onClick={chat.openSupport} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#c9b184] bg-white px-3.5 text-[12px] font-semibold text-[#2f2a22] hover:bg-[#f8f2e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7d5f2e]">
                <Headset size={13} aria-hidden="true" /> Talk to our team
              </button>
            </div>
          )}
          {state.sending && <TypingIndicator />}

          {state.error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#e8c4c0] bg-[#fdf1f0] px-3 py-2.5 text-[13px] text-[#9b2c2c]">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p>{state.error.message}</p>
                <div className="mt-1.5 flex flex-wrap gap-3 font-semibold">
                  {(state.error.handoffSuggested || state.error.retryable) && !state.supportOpen && (
                    <button type="button" onClick={chat.openSupport} className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[#7d5f2e]">Contact our team</button>
                  )}
                  <button type="button" onClick={chat.dismissError} className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[#7d5f2e]">Dismiss</button>
                </div>
              </div>
            </div>
          )}
          {state.notice && <p className="text-center text-[12px] text-[#6b6254]">{state.notice}</p>}
          <div ref={endRef} />
        </div>
      </div>

      {state.supportOpen ? (
        <div className="max-h-[60%] overflow-y-auto border-t border-[#eee7dc] pt-3">
          <SupportTicketForm ticket={state.ticket} onSubmit={chat.submitTicket} onClose={chat.closeSupport} defaultName={user?.fullName || ''} />
        </div>
      ) : (
        <div className="border-t border-[#eee7dc] bg-white px-3 pb-3 pt-2">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={chat.openSupport} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-[#7d5f2e] hover:bg-[#f8f2e8] focus-visible:outline-2 focus-visible:outline-[#7d5f2e]">
              <Headset size={14} aria-hidden="true" /> Talk to our team
            </button>
            {draft.length > MAX_CHARS * 0.8 && <span className={`text-[11px] ${draft.length >= MAX_CHARS ? 'text-[#9b2c2c]' : 'text-[#6b6254]'}`} aria-live="polite">{draft.length}/{MAX_CHARS}</span>}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (!sendDisabled) submit(draft); }} className="flex items-end gap-2">
            <label htmlFor="care-input" className="sr-only">Message to Aviana Care</label>
            <textarea
              id="care-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_CHARS}
              enterKeyHint="send"
              placeholder="Type your question…"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-[#d8c9ae] bg-[#fdfcf9] px-3.5 py-2.5 text-[16px] text-[#2f2a22] placeholder:text-[#7a7163] focus:border-[#7d5f2e] focus:outline-2 focus:outline-offset-1 focus:outline-[#7d5f2e] md:text-[14px]"
            />
            <button type="submit" disabled={sendDisabled} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8a6a38] to-[#7d5f2e] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a22] disabled:cursor-not-allowed disabled:opacity-45">
              <SendHorizontal size={18} aria-hidden="true" />
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] leading-snug text-[#6b6254]">AI assistant — please confirm bookings, payments and important details with our team. Messages may be processed by an external AI provider (Google Gemini); never share passwords, card details or verification codes here.</p>
        </div>
      )}
    </section>
  );
}
