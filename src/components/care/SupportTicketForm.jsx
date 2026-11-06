import { useId, useState } from 'react';
import { Check, Copy, Headset } from 'lucide-react';
import { validateTicketForm } from './chatApi';

const field = 'mt-1 w-full rounded-xl border border-[#d8c9ae] bg-white px-3 py-2.5 text-[16px] text-[#2f2a22] placeholder:text-[#7a7163] focus:border-[#7d5f2e] focus:outline-2 focus:outline-offset-1 focus:outline-[#7d5f2e] md:text-[14px]';

export default function SupportTicketForm({ ticket, onSubmit, onClose, defaultName = '' }) {
  const uid = useId();
  const [form, setForm] = useState({ name: defaultName, contact: '', message: '' });
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);
  const submitting = ticket.status === 'submitting';

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateTicketForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(form);
  };

  const copyReference = async () => {
    try { await navigator.clipboard.writeText(ticket.reference); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
  };

  if (ticket.status === 'done') {
    return (
      <div className="mx-3 mb-3 rounded-2xl border border-[#b9d8c4] bg-[#eef7f1] p-4 text-[#22663b]" role="status">
        <p className="flex items-center gap-2 text-[14px] font-semibold"><Check size={16} aria-hidden="true" /> {ticket.duplicate ? 'We already have this request' : 'Request received'}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#2f2a22]">
          Our team will contact you using the details you gave. Please keep your reference number:
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded-lg bg-white px-3 py-1.5 text-[15px] font-bold tracking-wider text-[#2f2a22]">{ticket.reference}</code>
          <button type="button" onClick={copyReference} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#22663b]/40 px-3 text-[12px] font-semibold hover:bg-[#22663b]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22663b]">
            <Copy size={12} aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-3 min-h-10 w-full rounded-full bg-[#2f2a22] px-4 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7d5f2e]">Back to chat</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-3 mb-3 rounded-2xl border border-[#e5d4b9] bg-[#fdfbf7] p-4" aria-label="Contact customer care">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-[#2f2a22]"><Headset size={16} aria-hidden="true" /> Talk to our team</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#6b6254]">Leave your details and we will get back to you. We only use them to answer this request.</p>

      <label htmlFor={`${uid}-name`} className="mt-3 block text-[12px] font-semibold text-[#2f2a22]">Your name</label>
      <input id={`${uid}-name`} className={field} value={form.name} onChange={update('name')} autoComplete="name" maxLength={100} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${uid}-name-e` : undefined} />
      {errors.name && <p id={`${uid}-name-e`} className="mt-1 text-[12px] text-[#9b2c2c]">{errors.name}</p>}

      <label htmlFor={`${uid}-contact`} className="mt-3 block text-[12px] font-semibold text-[#2f2a22]">Email or phone number</label>
      <input id={`${uid}-contact`} className={field} value={form.contact} onChange={update('contact')} autoComplete="email" inputMode="email" maxLength={160} aria-invalid={Boolean(errors.contact)} aria-describedby={errors.contact ? `${uid}-contact-e` : undefined} />
      {errors.contact && <p id={`${uid}-contact-e`} className="mt-1 text-[12px] text-[#9b2c2c]">{errors.contact}</p>}

      <label htmlFor={`${uid}-msg`} className="mt-3 block text-[12px] font-semibold text-[#2f2a22]">How can we help? <span className="font-normal text-[#6b6254]">(optional)</span></label>
      <textarea id={`${uid}-msg`} className={`${field} resize-none`} rows={3} value={form.message} onChange={update('message')} maxLength={1000} aria-invalid={Boolean(errors.message)} />
      {errors.message && <p className="mt-1 text-[12px] text-[#9b2c2c]">{errors.message}</p>}

      {ticket.status === 'error' && <p role="alert" className="mt-3 rounded-lg bg-[#fdf1f0] px-3 py-2 text-[12px] text-[#9b2c2c]">{ticket.message} Nothing was submitted — please try again.</p>}

      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={submitting} className="min-h-11 flex-1 rounded-full bg-gradient-to-br from-[#8a6a38] to-[#7d5f2e] px-4 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a22] disabled:opacity-60">
          {submitting ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-full border border-[#d8c9ae] px-4 text-[13px] font-semibold text-[#2f2a22] hover:bg-[#f3ece0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7d5f2e] disabled:opacity-60">Cancel</button>
      </div>
    </form>
  );
}
