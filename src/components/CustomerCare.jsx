import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  MessageCircle,
  X,
  Send,
  Headset,
  Sparkles,
} from "lucide-react";

import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const WELCOME_MESSAGE = {
  role: "assistant",
  text: "Hi, welcome to Aviana Care. ✨ How can I help you today?",
};

const starters = [
  "What services do you offer?",
  "How much does a massage cost?",
  "What is the difference between spa and home service?",
  "I want to talk to customer care",
];

const hiddenPaths = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/admin/login",
]);

const emptyForm = {
  name: "",
  contact: "",
  message: "",
};

export default function CustomerCare() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const userId = user?._id || user?.id || null;
  const activeUserIdRef = useRef(userId);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  // Keep requests from a previous signed-in account from updating the new account's UI.
  activeUserIdRef.current = userId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, handoff, ticket]);

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;
    activeUserIdRef.current = userId;

    // Every account switch starts with a clean UI. Signed-in users then load their own history.
    setMessages([WELCOME_MESSAGE]);
    setHandoff(false);
    setTicket("");
    setError("");
    setForm(emptyForm);

    if (!userId) return undefined;

    api
      .get("/chat/history")
      .then((data) => {
        if (cancelled || activeUserIdRef.current !== userId) return;

        const savedMessages = Array.isArray(data.messages)
          ? data.messages
              .filter(
                (item) =>
                  (item.role === "user" || item.role === "assistant") &&
                  typeof item.content === "string"
              )
              .map((item) => ({ role: item.role, text: item.content }))
          : [];

        setMessages(savedMessages.length ? savedMessages : [WELCOME_MESSAGE]);
      })
      .catch((historyError) => {
        if (!cancelled) {
          console.warn(
            "Unable to load Aviana Care history:",
            historyError?.message || historyError
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || busy) return;

    const requestedByUserId = userId;
    setMessages((previous) => [...previous, { role: "user", text: message }]);
    setInput("");
    setError("");
    setBusy(true);

    try {
      // api uses credentials: include, so Aviana's secure session cookie is sent.
      const data = await api.post("/chat", { message });

      if (activeUserIdRef.current !== requestedByUserId) return;

      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: data.reply },
      ]);

      if (data.handoff) setHandoff(true);
    } catch (requestError) {
      if (activeUserIdRef.current !== requestedByUserId) return;

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text:
            requestError.message ||
            "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function submitTicket(event) {
    event.preventDefault();
    if (busy) return;

    const requestedByUserId = userId;
    setBusy(true);
    setError("");

    try {
      const data = await api.post("/support-tickets", form);

      if (activeUserIdRef.current !== requestedByUserId) return;

      setTicket(data.reference);
      setHandoff(false);
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `Your request is saved. Your reference number is ${data.reference}. Our team can follow up using the contact details you provided.`,
        },
      ]);
    } catch (requestError) {
      if (activeUserIdRef.current === requestedByUserId) {
        setError(
          requestError.message || "Could not submit support request."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  // Do not display the floating chat on authentication/recovery pages or admin pages.
  const currentPath = location.pathname.toLowerCase();
  if (
    authLoading ||
    hiddenPaths.has(currentPath) ||
    currentPath.startsWith("/admin/")
  ) {
    return null;
  }

  const fieldClass =
    "w-full box-border rounded-lg border border-[#e8e0d4] bg-[#fdfbf7] px-3 py-2.5 text-[13px] font-normal text-[#302920] outline-none transition-colors placeholder:text-[#a49b8f] focus:border-[#b08d57]";

  return (
    <div className="font-sans">
      <button
        type="button"
        aria-label={open ? "Close Aviana Care" : "Open Aviana Care"}
        aria-expanded={open}
        aria-controls="aviana-care-chat"
        onClick={() => setOpen((previous) => !previous)}
        className={`fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] right-4 z-[9998] flex h-[54px] min-w-[54px] items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-[#c5a36b] to-[#a17b45] p-0 text-white shadow-[0_8px_26px_rgba(95,69,35,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(95,69,35,0.3)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b08d57] sm:bottom-6 sm:right-6 sm:h-[60px] sm:min-w-[60px] ${
          open
            ? "bg-none !bg-[#66533b] shadow-[0_7px_20px_rgba(48,41,32,0.2)]"
            : ""
        }`}
      >
        {open ? <X size={23} strokeWidth={1.8} /> : <MessageCircle size={23} strokeWidth={1.8} />}
      </button>

      {open && (
        <section
          id="aviana-care-chat"
          aria-label="Aviana customer care chat"
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] right-[10px] z-[9999] flex h-[min(590px,75dvh)] min-h-[320px] w-[calc(100vw-20px)] flex-col overflow-hidden rounded-[18px] border border-[#eee7dc] bg-[#fdfcf9] text-[#302920] shadow-[0_18px_55px_rgba(48,41,32,0.18)] [isolation:isolate] sm:bottom-[98px] sm:right-6 sm:h-[min(600px,calc(100dvh-125px))] sm:min-h-[350px] sm:w-[390px] sm:max-w-[calc(100vw-32px)] sm:rounded-[20px]"
        >
          <header className="flex shrink-0 items-center gap-[11px] bg-gradient-to-r from-[#b08d57] to-[#987443] px-3 py-3.5 text-white sm:p-4">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-white/60 bg-[#fdfcf9] text-[#927143]">
              <Sparkles size={20} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <strong className="text-base font-semibold tracking-[0.1px]">
                Aviana Care
              </strong>
              <span className="flex items-center gap-1.5 text-[11px] leading-snug text-white/90">
                <i className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#baf0be]" />
                AI assistant · Service information and customer care
              </span>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X size={19} />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain p-3.5 sm:gap-[15px] sm:p-[17px_14px]">
            <div className="max-w-full self-center rounded-[9px] border border-[#eee6da] bg-[#f4f0e8] px-3 py-2 text-center text-[10px] leading-relaxed text-[#817666]">
              For your privacy, don’t share passwords, OTPs or payment-card details.
              {userId ? " Your chat history is saved to your account." : " Guest chats are not saved to an account."}
            </div>

            {messages.map((messageItem, index) => (
              <div
                key={`${index}-${messageItem.role}`}
                className={`flex max-w-full items-end gap-2 ${
                  messageItem.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {messageItem.role === "assistant" && (
                  <div className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border border-[#e9dece] bg-[#f0e8db] text-[#927143]">
                    <Sparkles size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[88%] whitespace-pre-wrap break-words px-3 py-[11px] text-xs leading-[1.65] sm:max-w-[82%] sm:text-[13px] ${
                    messageItem.role === "assistant"
                      ? "rounded-[15px_15px_15px_4px] border border-[#eee5d8] bg-[#f3eee5] text-[#302920]"
                      : "rounded-[15px_15px_4px_15px] border border-[#785528]/10 bg-gradient-to-br from-[#b08d57] to-[#9d7946] text-white"
                  }`}
                >
                  {messageItem.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="ml-[35px] self-start text-xs text-[#837b70]">
                Aviana Care is typing
                <span className="ml-1 inline-block animate-pulse tracking-[2px]">···</span>
              </div>
            )}

            {!handoff && !ticket && messages.length <= 1 && (
              <div className="ml-[35px] flex flex-col items-start gap-2">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={busy}
                    onClick={() => sendMessage(starter)}
                    className="max-w-full rounded-xl border border-[#e5d4b9] bg-white px-3 py-[9px] text-left text-xs leading-relaxed text-[#927143] transition-colors hover:border-[#b08d57] hover:bg-[#f6efe4] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {handoff && !ticket && (
              <form
                onSubmit={submitTicket}
                className="flex w-full box-border flex-col gap-3 rounded-[15px] border border-[#eee7dc] bg-white p-3 sm:p-[15px]"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#927143]">
                  <Headset size={18} /> Connect with customer care
                </div>

                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#514638]">
                  Name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                    placeholder="Your name"
                    className={fieldClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#514638]">
                  Email or phone
                  <input
                    required
                    minLength={4}
                    maxLength={200}
                    autoComplete="email"
                    value={form.contact}
                    onChange={(event) => setForm((previous) => ({ ...previous, contact: event.target.value }))}
                    placeholder="How can we reach you?"
                    className={fieldClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-medium text-[#514638]">
                  How can we help?
                  <span className="text-[11px] font-normal text-[#837b70]">Optional</span>
                  <textarea
                    maxLength={1000}
                    rows={2}
                    value={form.message}
                    onChange={(event) => setForm((previous) => ({ ...previous, message: event.target.value }))}
                    placeholder="Briefly describe your question"
                    className={`${fieldClass} min-h-[65px] resize-y`}
                  />
                </label>

                {error && <p role="alert" className="m-0 text-xs leading-relaxed text-[#b42318]">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[42px] w-full rounded-[10px] bg-gradient-to-r from-[#b08d57] to-[#987443] px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:from-[#927143] hover:to-[#806137] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send support request"}
                </button>
                <p className="m-0 text-[10px] leading-relaxed text-[#837b70]">
                  This creates a support ticket; it does not start a live chat.
                </p>
              </form>
            )}

            {ticket && (
              <div className="ml-[35px] flex max-w-full flex-col items-start gap-2.5 rounded-xl border border-[#e7dccb] bg-[#f3eee5] p-3.5 text-xs">
                <strong className="text-[13px] text-[#4a6747]">Support request created</strong>
                <span className="max-w-full break-words text-[#837b70]">Reference: {ticket}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTicket("");
                    setHandoff(false);
                    setError("");
                    setForm(emptyForm);
                  }}
                  className="rounded-lg border border-[#e5d4b9] bg-white px-3 py-2 text-xs text-[#927143] hover:bg-[#f8f2e8]"
                >
                  Back to chat
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!handoff && !ticket && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              className="flex shrink-0 items-center gap-2 border-t border-[#eee7dc] bg-white p-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Message Aviana Care…"
                maxLength={2000}
                aria-label="Message"
                className="h-[42px] min-w-0 flex-1 rounded-full border border-[#ece5da] bg-[#f8f6f1] px-3 text-[13px] text-[#302920] outline-none transition-colors placeholder:text-[#a49b8f] focus:border-[#b08d57]"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#b08d57] text-white transition-colors hover:bg-[#927143] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send size={17} />
              </button>
            </form>
          )}

          <footer className="shrink-0 border-t border-[#eee7dc] bg-white px-3 py-[9px] text-center text-[10px] tracking-[0.3px] text-[#938777]">
            Aviana Spa · Customer care
          </footer>
        </section>
      )}
    </div>
  );
}
