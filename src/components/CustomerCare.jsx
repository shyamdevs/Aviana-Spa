import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ChatPanel from './care/ChatPanel';
import { hasMobileBottomBar, isChatHiddenPath } from './care/visibility';
import { useCareChat } from './care/useCareChat';

/*
 * Aviana Care - the customer-care chat widget (mounted once in AppRoutes).
 * Hidden on authentication screens and the whole /admin area (see care/visibility.js).
 * Layers sit BELOW the navbar, SweetAlert and Razorpay, and above page content.
 */
export default function CustomerCare() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const launcherRef = useRef(null);
  const inputRef = useRef(null);

  const hidden = isChatHiddenPath(pathname) || loading;
  const panelOpen = open && !hidden;
  const chat = useCareChat({ user, enabled: !hidden, panelOpen });

  // Focus the input when the panel opens; give focus back to the launcher when it closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (panelOpen && !wasOpen.current) inputRef.current?.focus();
    if (!panelOpen && wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = panelOpen;
  }, [panelOpen]);

  if (hidden) return null;

  // On /booking (mobile) a fixed action bar occupies the bottom; keep the launcher above it.
  const barOffset = hasMobileBottomBar(pathname);
  const launcherBottom = barOffset ? 'bottom-[calc(7.5rem+env(safe-area-inset-bottom))] md:bottom-5' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-5';
  const panelBottom = barOffset ? 'bottom-[calc(7rem+env(safe-area-inset-bottom))] md:bottom-5' : 'bottom-[calc(0.5rem+env(safe-area-inset-bottom))] sm:bottom-5';

  return (
    <>
      {panelOpen && (
        <ChatPanel chat={chat} user={user} inputRef={inputRef} onClose={() => setOpen(false)} bottomOffsetClass={panelBottom} />
      )}
      {!panelOpen && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Aviana Care chat"
          aria-haspopup="dialog"
          className={`fixed right-4 z-[45] flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-br from-[#8a6a38] to-[#6f5326] px-4 text-white shadow-[0_10px_30px_-6px_rgba(48,41,32,0.5)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a22] motion-reduce:transition-none sm:right-5 ${launcherBottom}`}
        >
          <MessageCircle size={22} aria-hidden="true" />
          <span className="hidden text-[14px] font-semibold sm:inline">Chat with us</span>
        </button>
      )}
    </>
  );
}
