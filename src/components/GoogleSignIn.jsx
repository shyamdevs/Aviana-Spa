import { useEffect, useRef } from 'react';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function GoogleSignIn({ onSuccess, onError }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.google || !ref.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: (response) => onSuccess(response.credential) });
      ref.current.innerHTML = '';
      window.google.accounts.id.renderButton(ref.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 360 });
    };
    if (window.google?.accounts?.id) { render(); return () => { cancelled = true; }; }
    const existing = document.querySelector('script[data-google-gsi]');
    if (existing) { existing.addEventListener('load', render, { once: true }); return () => { cancelled = true; }; }
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.dataset.googleGsi = 'true'; script.onload = render; script.onerror = () => onError?.(new Error('Google sign-in could not load.')); document.head.appendChild(script);
    return () => { cancelled = true; };
  }, [onSuccess, onError]);
  if (!clientId) return null;
  return <div className="mt-8"><div className="mb-4 flex items-center gap-3"><span className="h-px flex-1 bg-[#ded7cc]"/><span className="text-[10px] uppercase tracking-[0.18em] text-[#9b9184]">or</span><span className="h-px flex-1 bg-[#ded7cc]"/></div><div ref={ref} className="flex justify-center"/></div>;
}
