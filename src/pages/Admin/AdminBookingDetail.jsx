import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import MediaImage from '../../components/MediaImage';
import { adminApi } from '../../store/AdminContext';
import { money, prettyDate, titleCase } from '../../utils/format';

export default function AdminBookingDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');


  useEffect(() => { let active = true; (async () => { try { const response = await adminApi.get(`/bookings/${id}`); if (active) setData(response); } catch (e) { if (active) setError(e.message); } })(); return () => { active = false; }; }, [id]);

  const booking = data?.booking;
  const customer = data?.customer;
  const payments = data?.payments || [];
  const remaining = Number(booking?.remainingAmount || 0);
  const canCollect = ['BOOKING', 'HALF'].includes(booking?.paymentType) && booking?.bookingStatus === 'completed' && remaining > 0;

  const updateStatus = async (status) => {
    setBusy(true); setError(''); setMessage('');
    try { const response = await adminApi.patch(`/bookings/${id}/status`, { status }); setData((prev) => ({ ...prev, booking: response.booking })); setMessage('Booking status updated.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const recordRemaining = async (event) => {
    event.preventDefault();
    if (!canCollect) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await adminApi.post(`/bookings/${id}/remaining-payment`, { amount: remaining, method, reference });
      setData((prev) => ({ ...prev, booking: response.booking, payments: [...(prev.payments || []), response.payment] }));
      setReference('');
      setMessage('Remaining payment recorded successfully.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const breakdown = useMemo(() => [
    ['Base service', Number(booking?.subtotal || 0) - Number((booking?.extraServices || []).reduce((sum, item) => sum + Number(item.price || 0), 0) || 0)],
    ...((booking?.extraServices || []).map((item) => [item.name, item.price])),
    ['Subtotal', booking?.subtotal],
    ['Discount', booking?.discountAmount ? `− ${money(booking.discountAmount)}` : money(0)],
    ['Total', booking?.totalAmount ?? booking?.price, true],
    ['Paid', booking?.paidAmount, true],
    ['Remaining', booking?.remainingAmount, true],
  ], [booking]);

  if (error && !data) return <AdminLayout><p className="text-sm text-red-400">{error}</p><Link to="/admin/bookings" className="mt-5 inline-block text-[10px] tracking-[0.18em] text-[#b08d57]">← BOOKINGS</Link></AdminLayout>;
  if (!data) return <AdminLayout><p className="text-sm text-white/50">Loading booking…</p></AdminLayout>;

  return <AdminLayout>
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] uppercase tracking-[0.22em] text-[#b08d57]">Booking detail</p><h1 className="mt-2 font-serif text-4xl sm:text-5xl">{booking?.service?.title || 'Appointment'}</h1><p className="mt-2 text-sm text-white/45">{booking?._id}</p></div>
      <Link to="/admin/bookings" className="text-[10px] tracking-[0.18em] text-[#b08d57]">← BOOKINGS</Link>
    </div>
    {error && <div className="mb-5 border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}
    {message && <div className="mb-5 border border-emerald-400/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">{message}</div>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-6">
        <article className="overflow-hidden border border-white/10 bg-[#1d1b17]">
          <div className="grid lg:grid-cols-[260px_1fr]">
            <MediaImage src={booking?.therapist?.profileImage} name={booking?.therapist?.name} alt={booking?.therapist?.name} wrapperClassName="h-72 lg:h-full" className="h-full w-full object-cover" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">{titleCase(booking?.bookingStatus)}</p><h2 className="mt-2 font-serif text-3xl">{booking?.therapist?.name}</h2><p className="mt-1 text-sm text-white/45">{titleCase(booking?.therapist?.gender)} · {booking?.therapist?.experience || 0}+ years</p></div><div className="sm:text-right"><p className="font-serif text-2xl">{money(booking?.totalAmount ?? booking?.price)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#b08d57]">{booking?.paymentType || 'FULL'} · {titleCase(booking?.paymentStatus)}</p></div></div>
              <div className="mt-7 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-2">
                <Info label="Customer" value={customer?.fullName || booking?.customerName} /><Info label="Email" value={customer?.email || booking?.customerEmail} /><Info label="Phone" value={customer?.phone || booking?.customerPhone} /><Info label="Date & time" value={`${prettyDate(booking?.date)} · ${booking?.time}`} /><Info label="Booking type" value={booking?.bookingType === 'home' ? 'Home massage' : 'Spa visit'} /><Info label="Address" value={booking?.bookingType === 'home' ? booking?.homeAddress : booking?.spaAddress} />
              </div>
            </div>
          </div>
        </article>

        <article className="border border-white/10 bg-[#1d1b17] p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Selected treatment</p><h2 className="mt-2 font-serif text-2xl">{booking?.service?.title}</h2><p className="mt-2 text-sm leading-6 text-white/50">{booking?.service?.description}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3"><Info label="Duration" value={`${booking?.durationMinutes} minutes`} /><Info label="Specialization" value={booking?.therapist?.specialization} /><Info label="Therapist rating" value={Number(booking?.therapist?.rating || 0).toFixed(1)} /></div>
        </article>

        <article className="border border-white/10 bg-[#1d1b17] p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Extra services</p>
          <div className="mt-4 space-y-3">{(booking?.extraServices || []).length ? (booking.extraServices.map((extra) => <div key={`${extra.serviceId}-${extra.name}`} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 text-sm last:border-0"><span className="text-white/65">{extra.name}</span><span>{money(extra.price)}</span></div>)) : <p className="text-sm text-white/40">No extra services were selected.</p>}</div>
        </article>

        <article className="overflow-x-auto border border-white/10 bg-[#1d1b17]"><div className="min-w-[780px] p-6 sm:p-8"><p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Payment ledger</p><div className="mt-5 space-y-4">{payments.map((payment) => <div key={payment._id} className="grid grid-cols-[1fr_140px_130px] gap-4 border-b border-white/5 pb-4 text-sm last:border-0"><div><p>{payment.paymentPurpose === 'REMAINING' ? 'Remaining online payment' : payment.paymentPurpose === 'MANUAL' ? 'Remaining offline payment' : 'Initial payment'}</p><p className="mt-1 break-all font-mono text-[10px] text-white/30">{payment.paymentId || payment.orderId || '—'}</p></div><div><p>{money(payment.amount)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">{payment.provider || 'razorpay'}</p></div><div><p>{titleCase(payment.status)}</p><p className="mt-1 text-[10px] text-white/35">{prettyDate(payment.createdAt)}</p></div></div>)}{!payments.length && <p className="text-sm text-white/40">No payment records for this booking.</p>}</div></div></article>
      </section>

      <aside className="space-y-6">
        <section className="border border-white/10 bg-[#1d1b17] p-6"><p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Payment breakdown</p><div className="mt-5 space-y-3">{breakdown.map(([label,value,strong],index)=><div key={`${label}-${index}`} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 text-sm last:border-0"><span className="text-white/45">{label}</span><span className={strong ? 'font-serif text-xl' : ''}>{typeof value === 'string' ? value : money(value)}</span></div>)}</div></section>
        <section className="border border-white/10 bg-[#1d1b17] p-6"><p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Booking status</p><select value={booking?.bookingStatus || ''} disabled={busy} onChange={(e) => updateStatus(e.target.value)} className="mt-4 min-h-12 w-full bg-[#25221d] px-3 text-sm outline-none"><option value="payment_pending">Payment pending</option><option value="confirmed">Confirmed</option><option value="completed">Service completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select></section>
        {canCollect && <section className="border border-[#b08d57]/30 bg-[#201e1a] p-6"><p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Collect remaining payment</p><p className="mt-3 text-sm leading-6 text-white/60">The customer has a remaining balance of <strong className="text-white">{money(remaining)}</strong>. Record the exact amount received offline.</p><form onSubmit={recordRemaining} className="mt-5 space-y-4"><label className="block"><span className="text-[10px] uppercase tracking-[0.16em] text-white/35">Method</span><select value={method} onChange={(e)=>setMethod(e.target.value)} className="mt-2 min-h-11 w-full bg-[#2a2721] px-3 text-sm"><option>Cash</option><option>Card</option><option>UPI</option><option>Bank transfer</option><option>Other</option></select></label><label className="block"><span className="text-[10px] uppercase tracking-[0.16em] text-white/35">Reference (optional)</span><input value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="Receipt / transaction reference" className="mt-2 min-h-11 w-full border-b border-white/10 bg-transparent px-0 text-sm outline-none focus:border-[#b08d57]" /></label><button disabled={busy} className="w-full bg-[#b08d57] px-5 py-4 text-[10px] tracking-[0.18em] disabled:opacity-50">{busy ? 'RECORDING…' : `RECORD ${money(remaining)}`}</button></form></section>}
      </aside>
    </div>
  </AdminLayout>;
}
function Info({ label, value }) { return <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">{label}</p><p className="mt-1 break-words text-sm leading-6 text-white/75">{value || '—'}</p></div>; }
