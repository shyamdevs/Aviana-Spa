import { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { adminApi } from '../../store/AdminContext';
import { money } from '../../utils/format';

const blank = { name: 'Booking Amount', description: 'Pay the fixed booking amount to reserve your appointment. The balance is payable after your service.', price: '', isActive: true };

export default function AdminBookingOption() {
  const [option, setOption] = useState(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await adminApi.get('/booking-option');
      setOption(response.bookingOption || null);
      if (response.bookingOption) setForm({
        name: response.bookingOption.name,
        description: response.bookingOption.description || '',
        price: response.bookingOption.price,
        isActive: response.bookingOption.isActive !== false,
      });
      else setForm(blank);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = { ...form, price: Number(form.price), isActive: Boolean(form.isActive) };
      const response = option
        ? await adminApi.patch(`/booking-option/${option._id}`, payload)
        : await adminApi.post('/booking-option', payload);
      setOption(response.bookingOption);
      setForm({ name: response.bookingOption.name, description: response.bookingOption.description || '', price: response.bookingOption.price, isActive: response.bookingOption.isActive !== false });
      setMessage(option ? 'Booking amount updated.' : 'Booking amount added and enabled for checkout.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const toggle = async () => {
    if (!option) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await adminApi.patch(`/booking-option/${option._id}/status`, { isActive: !option.isActive });
      setOption(response.bookingOption);
      setForm((current) => ({ ...current, isActive: response.bookingOption.isActive }));
      setMessage(response.bookingOption.isActive ? 'Booking amount enabled.' : 'Booking amount disabled.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!option || !window.confirm('Delete this booking amount? It will no longer appear as a payment option.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await adminApi.delete(`/booking-option/${option._id}`);
      setOption(null); setForm(blank); setMessage('Booking amount deleted.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <AdminLayout>
    <p className="text-[10px] uppercase tracking-[0.22em] text-[#b08d57]">Administration</p>
    <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Booking payment</h1>
    <p className="mt-3 mb-8 max-w-2xl text-sm leading-7 text-white/45">Set the fixed amount a customer can pay to reserve an appointment instead of paying the full discounted amount. The balance is collected after service.</p>
    {error && <div className="mb-5 border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}
    {message && <div className="mb-5 border border-emerald-400/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">{message}</div>}

    {loading ? <div className="border border-white/10 bg-[#1d1b17] p-6 text-sm text-white/45">Loading booking payment setting…</div> : <>
      <form onSubmit={save} className="max-w-3xl space-y-6 border border-white/10 bg-[#1d1b17] p-6 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Option name" value={form.name} onChange={(v) => setForm((x) => ({ ...x, name: v }))} required />
          <Field label="Fixed booking amount" type="number" min="1" step="1" value={form.price} onChange={(v) => setForm((x) => ({ ...x, price: v }))} placeholder="Example: 500" required />
        </div>
        <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm((x) => ({ ...x, isActive: e.target.checked }))}/> Show as a payment option for new bookings</label>
        <label className="block"><span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Description</span><textarea value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} rows="4" className="mt-2 w-full border border-white/10 bg-transparent p-3 text-sm outline-none focus:border-[#b08d57]"/></label>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} className="bg-[#b08d57] px-6 py-4 text-[10px] tracking-[0.18em] disabled:opacity-50">{busy ? (option ? 'SAVING…' : 'ADDING…') : (option ? 'UPDATE BOOKING AMOUNT' : 'ADD BOOKING AMOUNT')}</button>
          {option && <button type="button" onClick={toggle} disabled={busy} className="border border-white/10 px-6 py-4 text-[10px] tracking-[0.18em] disabled:opacity-50">{option.isActive ? 'DISABLE' : 'ENABLE'}</button>}
          {option && <button type="button" onClick={remove} disabled={busy} className="border border-red-400/20 px-6 py-4 text-[10px] tracking-[0.18em] text-red-400 disabled:opacity-50">DELETE</button>}
        </div>
      </form>

      {option && <section className="mt-6 max-w-3xl border border-white/10 bg-[#1d1b17] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Live checkout option</p><h2 className="mt-2 font-serif text-2xl">{option.name}</h2><p className="mt-2 text-sm leading-6 text-white/45">{option.description}</p></div>
          <div className="shrink-0 sm:text-right"><p className="font-serif text-3xl">{money(option.price)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">{option.isActive ? 'Visible at checkout' : 'Disabled'}</p></div>
        </div>
      </section>}
    </>}
  </AdminLayout>;
}

function Field({ label, value, onChange, ...props }) { return <label className="block"><span className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</span><input {...props} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full border-b border-white/10 bg-transparent py-3 text-sm outline-none focus:border-[#b08d57]"/></label>; }
