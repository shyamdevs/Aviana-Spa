import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalShell from '../../components/PortalShell';
import MediaImage from '../../components/MediaImage';
import { api } from '../../services/api';
import { createInitialOrder, createRemainingOrder, openRazorpay, verifyRazorpayPaymentWithRecovery } from '../../services/paymentService';
import { money, prettyDate, titleCase } from '../../utils/format';
import { confirmAction, showError, showInfo, showSuccess } from '../../utils/alerts';

export default function BookingDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const paymentSuccessRef = useRef(false);

  const load = () => {
    setError('');
    api.get(`/bookings/${id}`).then(setData).catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const cancel = async () => {
    const result = await confirmAction({
      title: 'Cancel this booking?',
      text: 'Your booking will be cancelled according to Aviana cancellation and refund rules.',
      confirmText: 'Yes, cancel booking',
      cancelText: 'Keep booking',
    });
    if (!result.isConfirmed) return;
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/cancel`, { reason: 'Customer request' });
      await showSuccess('Booking cancelled', 'Your cancellation request has been processed.');
      load();
    } catch (e) {
      setError(e.message);
      showError('Could not cancel booking', e.message);
    } finally {
      setBusy(false);
    }
  };

  const payInitial = async () => {
    setBusy(true);
    setError('');
    try {
      const current = data?.booking;
      if (!current || current.bookingStatus !== 'payment_pending') {
        throw new Error('This booking is no longer awaiting its initial payment.');
      }
      const order = await createInitialOrder(id);
      paymentSuccessRef.current = false;
      await openRazorpay({
        order: order.order,
        keyId: order.keyId,
        description: `Appointment payment · ${current.service?.title || 'Aviana booking'}`,
        prefill: { name: current.customerName, email: current.customerEmail, contact: current.customerPhone },
        onDismiss: () => {
          if (!paymentSuccessRef.current) {
            setBusy(false);
            showInfo('Payment window closed', 'Your booking is still awaiting payment. You can safely retry.');
          }
        },
        onSuccess: async (response) => {
          paymentSuccessRef.current = true;
          try {
            const verified = await verifyRazorpayPaymentWithRecovery(response, id);
            setData((previous) => ({ ...(previous || {}), ...verified }));
            await showSuccess('Payment successful', 'Your Aviana appointment is now confirmed.');
            load();
          } catch (e) {
            setError(e.message);
            paymentSuccessRef.current = false;
            showError('Payment verification failed', `${e.message} Please check this booking again before paying twice.`);
          } finally {
            setBusy(false);
          }
        },
        onFailure: (response) => {
          paymentSuccessRef.current = false;
          const reason = response?.error?.description || 'The payment attempt was not completed.';
          setError(reason);
          showError('Payment not completed', `${reason} You can retry this same booking without creating another booking.`);
          setBusy(false);
        },
      });
    } catch (e) {
      setError(e.message);
      showError('Unable to open payment', e.message);
      setBusy(false);
    }
  };

  const payRemaining = async () => {
    setBusy(true);
    setError('');
    try {
      const order = await createRemainingOrder(id);
      paymentSuccessRef.current = false;
      await openRazorpay({
        order: order.order,
        keyId: order.keyId,
        description: `Remaining balance · ${data.booking.service?.title || 'Aviana booking'}`,
        prefill: { name: data.booking.customerName, email: data.booking.customerEmail, contact: data.booking.customerPhone },
        onDismiss: () => {
          if (!paymentSuccessRef.current) {
            setBusy(false);
            showInfo('Payment window closed', 'Your remaining balance is unchanged. You can retry safely.');
          }
        },
        onSuccess: async (response) => {
          paymentSuccessRef.current = true;
          try {
            const verified = await verifyRazorpayPaymentWithRecovery(response, id);
            setData((previous) => ({ ...(previous || {}), ...verified }));
            await showSuccess('Remaining payment received', 'Your booking is now fully paid.');
            load();
          } catch (e) {
            setError(e.message);
            paymentSuccessRef.current = false;
            showError('Payment verification failed', `${e.message} Please check your booking before retrying.`);
          } finally {
            setBusy(false);
          }
        },
        onFailure: (response) => {
          paymentSuccessRef.current = false;
          const reason = response?.error?.description || 'The payment attempt was not completed.';
          setError(reason);
          showError('Payment not completed', reason);
          setBusy(false);
        },
      });
    } catch (e) {
      setError(e.message);
      showError('Unable to open payment', e.message);
      setBusy(false);
    }
  };

  if (error && !data) return <PortalShell title="Booking details"><div className="border border-red-200 bg-red-50 p-8 text-sm text-red-700"><p>{error}</p><button onClick={load} className="mt-5 text-[10px] tracking-[0.18em]">RETRY</button></div></PortalShell>;
  if (!data) return <PortalShell title="Booking details"><div className="animate-pulse border border-black/5 bg-white p-7"><div className="h-8 w-1/2 bg-[#eee8df]"/></div></PortalShell>;

  const { booking, payment } = data;
  const initialPaymentPending = booking.bookingStatus === 'payment_pending' && ['PENDING', 'FAILED'].includes(String(booking.paymentStatus || '').toUpperCase());
  const outstandingBalance = booking.paymentType === 'BOOKING' && Number(booking.remainingAmount || 0) > 0;
  const extras = booking.extraServices || [];

  return <PortalShell title="Booking details"><div className="space-y-6">
    <Link to="/dashboard/bookings" className="text-[10px] tracking-[0.18em] text-[#8f7042]">← ALL BOOKINGS</Link>
    {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="overflow-hidden border border-black/5 bg-white"><div className="grid lg:grid-cols-[320px_1fr]">
      <MediaImage src={booking.therapist?.profileImage} name={booking.therapist?.name} alt={booking.therapist?.name} wrapperClassName="h-full min-h-[340px] lg:min-h-full" className="h-full w-full object-cover"/>
      <div className="p-7 sm:p-9">
        <div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#b08d57]">{titleCase(booking.bookingStatus)}</p><h1 className="mt-3 font-serif text-4xl">{booking.service?.title}</h1><p className="mt-2 text-sm text-[#7c725f]">{prettyDate(booking.date)} · {booking.time} · {booking.durationMinutes} min</p></div><p className="font-serif text-2xl">{money(booking.totalAmount ?? booking.price)}</p></div>
        <div className="mt-9 grid gap-6 border-t border-[#eee8df] pt-7 sm:grid-cols-2">
          <Info label="Booking ID" value={booking._id}/><Info label="Therapist" value={`${booking.therapist?.name} · ${booking.therapist?.gender === 'female' ? 'Woman' : 'Man'}`}/><Info label="Experience" value={`${booking.therapist?.experience || 0}+ years`}/><Info label="Specialization" value={booking.therapist?.specialization}/><Info label="Booking type" value={booking.bookingType === 'home' ? 'Home massage' : 'Spa visit'}/><Info label="Address" value={booking.bookingType === 'home' ? booking.homeAddress : booking.spaAddress}/><Info label="Payment type" value={booking.paymentType}/><Info label="Payment status" value={booking.paymentStatus}/><Info label="Payment ID" value={payment?.paymentId || booking.razorpayPaymentId}/>
        </div>

        {initialPaymentPending && <div className="mt-7 border border-[#e4dacb] bg-[#f8f3eb] p-5 text-sm text-[#6f5a3b]"><p><strong>Your appointment is reserved but payment is still pending.</strong> You can complete payment for this existing booking without creating a new appointment.</p><button onClick={payInitial} disabled={busy} className="mt-5 bg-[#b08d57] px-6 py-4 text-[10px] tracking-[0.18em] text-white disabled:opacity-50">{busy ? 'OPENING CHECKOUT…' : `PAY NOW ${money(booking.initialPaymentAmount || booking.totalAmount)}`}</button></div>}

        {booking.cancellation?.cancelledAt && <div className="mt-7 border border-red-100 bg-red-50 p-4 text-sm text-red-700"><strong>Cancelled:</strong> {booking.cancellation.reason || 'Customer cancellation'}{booking.cancellation.refundAmount ? ` · Refund ₹${Number(booking.cancellation.refundAmount).toLocaleString('en-IN')}` : ''}</div>}
        {outstandingBalance && booking.bookingStatus === 'completed' && <div className="mt-7 border border-[#e4dacb] bg-[#f8f3eb] p-5 text-sm text-[#6f5a3b]"><p><strong>Booking amount paid.</strong> Remaining {money(booking.remainingAmount)} is now due after your service.</p><button onClick={payRemaining} disabled={busy} className="mt-5 bg-[#b08d57] px-6 py-4 text-[10px] tracking-[0.18em] text-white disabled:opacity-50">{busy ? 'OPENING CHECKOUT…' : `PAY REMAINING ${money(booking.remainingAmount)}`}</button></div>}
        {booking.bookingStatus === 'confirmed' && <div className="mt-8 flex flex-wrap gap-3"><Link to={`/dashboard/bookings/${booking._id}/reschedule`} className="bg-[#201e1a] px-6 py-4 text-[10px] tracking-[0.18em] text-white">RESCHEDULE</Link><button onClick={cancel} disabled={busy} className="border border-red-200 px-6 py-4 text-[10px] tracking-[0.18em] text-red-600 disabled:opacity-50">{busy ? 'CANCELLING…' : 'CANCEL BOOKING'}</button></div>}
      </div>
    </div></section>

    <section className="border border-black/5 bg-white p-7 sm:p-9"><p className="text-[10px] uppercase tracking-[0.2em] text-[#b08d57]">Payment breakdown</p><h2 className="mt-3 font-serif text-3xl">Your appointment at a glance.</h2><div className="mt-7 grid gap-8 lg:grid-cols-2"><div className="space-y-2"><PriceLine label="Subtotal" value={money(booking.subtotal)} /><PriceLine label="Discount" value={booking.discountAmount ? `− ${money(booking.discountAmount)}` : money(0)} />{extras.map((extra) => <PriceLine key={`${extra.serviceId}-${extra.name}`} label={extra.name} value={money(extra.price)} />)}</div><div className="space-y-2 border-t border-[#eee8df] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><PriceLine label="Total amount" value={money(booking.totalAmount ?? booking.price)} strong /><PriceLine label="Paid amount" value={money(booking.paidAmount)} /><PriceLine label="Remaining amount" value={money(booking.remainingAmount)} strong /><PriceLine label="Payment type" value={booking.paymentType} /></div></div></section>
    <div className="grid gap-6 lg:grid-cols-2"><section className="border border-black/5 bg-white p-7"><p className="text-[10px] uppercase tracking-[0.2em] text-[#b08d57]">Therapist</p><h2 className="mt-3 font-serif text-2xl">{booking.therapist?.name}</h2><p className="mt-3 text-sm leading-7 text-[#7c725f]">{booking.therapist?.bio}</p></section><section className="border border-black/5 bg-white p-7"><p className="text-[10px] uppercase tracking-[0.2em] text-[#b08d57]">Service</p><h2 className="mt-3 font-serif text-2xl">{booking.service?.title}</h2><p className="mt-3 text-sm leading-7 text-[#7c725f]">{booking.service?.description}</p></section></div>
  </div></PortalShell>;
}
function Info({ label, value }) { return <div><p className="text-[10px] uppercase tracking-[0.16em] text-[#9a8f81]">{label}</p><p className="mt-2 break-words text-sm leading-6 text-[#504a42]">{value || '—'}</p></div>; }
function PriceLine({ label, value, strong = false }) { return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-[#7c725f]">{label}</span><span className={strong ? 'font-serif text-xl' : 'font-medium'}>{value}</span></div>; }
