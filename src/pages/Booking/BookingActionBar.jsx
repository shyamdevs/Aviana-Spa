import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Mobile-only sticky action bar for the booking flow (hidden from md up, where the
 * normal inline buttons are used instead).
 *
 * - Rendered in a portal on <body>: the form sits inside an animated (transformed)
 *   wrapper, and `position: fixed` inside a transformed ancestor is positioned
 *   against that ancestor instead of the viewport.
 * - z-50 sits below the navbar (z-100) and the full-screen mobile menu (z-60), and
 *   far below SweetAlert2 / Razorpay overlays.
 * - Slides away while a text field is focused (the on-screen keyboard is open) so it
 *   never floats in the middle of the screen, and while the site footer is visible.
 */
const TEXT_TYPES = new Set(['text', 'email', 'tel', 'password', 'search', 'url', 'number', 'date', 'time']);

function isTextEntry(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return TEXT_TYPES.has((el.getAttribute('type') || 'text').toLowerCase());
  return false;
}

export default function BookingActionBar({ children, hint }) {
  const [typing, setTyping] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const onIn = (e) => setTyping(isTextEntry(e.target));
    const onOut = () => setTyping(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const hidden = typing || footerVisible;

  return createPortal(
    <div
      role="region"
      aria-label="Booking actions"
      aria-hidden={hidden}
      inert={hidden}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-[#e3ddd4] bg-[#fdfcf9] px-4 pt-3 pb-safe shadow-[0_-10px_28px_rgba(55,43,28,0.10)] transition-transform duration-300 md:hidden ${hidden ? 'translate-y-full' : 'translate-y-0'}`}
    >
      {hint ? (
        <p role="status" aria-live="polite" className="mb-2 truncate text-xs text-[#6f5a3b]">
          {hint}
        </p>
      ) : null}
      <div className="flex items-stretch gap-3">{children}</div>
    </div>,
    document.body,
  );
}
