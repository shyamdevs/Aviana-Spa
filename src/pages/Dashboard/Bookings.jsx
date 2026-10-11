import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../../components/PortalShell';
import MediaImage from '../../components/MediaImage';
import { api } from '../../services/api';
import { money, prettyDate, titleCase } from '../../utils/format';
import { confirmAction, showError, showSuccess } from '../../utils/alerts';

const tabs = ['upcoming', 'confirmed', 'completed', 'cancelled', 'rescheduled'];

export default function Bookings() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const result = await api.get('/bookings/my'); setItems(result.bookings || []); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const grouped = useMemo(() => ({
    upcoming: items.filter((b) => ['confirmed', 'payment_pending'].includes(b.bookingStatus) && new Date(b.date) >= new Date()),
    confirmed: items.filter((b) => b.bookingStatus === 'confirmed'),
    completed: items.filter((b) => b.bookingStatus === 'completed'),
    cancelled: items.filter((b) => b.bookingStatus === 'cancelled'),
    rescheduled: items.filter((b) => Array.isArray(b.rescheduleHistory) && b.rescheduleHistory.length > 0),
  }), [items]);
  const cancel = async (id) => {
    const result = await confirmAction({ title: 'Cancel this booking?', text: 'Your booking will be cancelled according to Aviana cancellation and refund rules.', confirmText: 'Yes, cancel booking', cancelText: 'Keep booking' });
    if (!result.isConfirmed) return;
    try { await api.patch(`/bookings/${id}/cancel`, { reason: 'Customer request' }); await showSuccess('Booking cancelled', 'Your cancellation request has been processed.'); await load(); }
    catch (err) { setError(err.message); showError('Could not cancel booking', err.message); }
  };
  return <PortalShell title="Your bookings"><div className="space-y-7"><div className="flex gap-2 overflow-x-auto pb-2">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`min-h-10 shrink-0 rounded-full border px-5 text-[10px] uppercase tracking-[0.16em] ${tab === item ? 'border-[#201e1a] bg-[#201e1a] text-white' : 'border-[#d9d1c5] bg-white text-[#6f685d]'}`}>{item}</button>)}</div>{error && <div className="flex items-center justify-between gap-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={load} className="shrink-0 text-[10px] tracking-[0.16em]">RETRY</button></div>}{loading ? <Skeleton/> : grouped[tab].length ? <div className="space-y-4">{grouped[tab].map((booking) => <BookingCard key={booking._id} booking={booking} onCancel={cancel}/>)}</div> : <Empty tab={tab}/>}</div></PortalShell>;
}

function BookingCard({ booking, onCancel }) {
  const canCancel = ['confirmed', 'payment_pending'].includes(booking.bookingStatus);
  const canReschedule = booking.bookingStatus === 'confirmed';
  const canPayInitial = booking.bookingStatus === 'payment_pending' && ['PENDING', 'FAILED'].includes(String(booking.paymentStatus || '').toUpperCase());
  const extras = booking.extraServices || [];
  const outstandingBalance = booking.paymentType === 'BOOKING' && Number(booking.remainingAmount || 0) > 0;
  return <article className="overflow-hidden border border-black/5 bg-white"><div className="grid md:grid-cols-[150px_1fr]"><MediaImage src={booking.therapist?.profileImage} name={booking.therapist?.name} alt={booking.therapist?.name} wrapperClassName="aspect-[4/3] md:aspect-auto md:min-h-[210px]" className="h-full w-full object-cover"/><div className="min-w-0 p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f4eee5] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#8f7042]">{titleCase(booking.bookingStatus)}</span><span className="text-[10px] uppercase tracking-[0.14em] text-[#9b9184]">{booking.paymentType} · {booking.paymentStatus}</span></div><h2 className="mt-3 truncate font-serif text-2xl">{booking.service?.title || 'Treatment'}</h2><p className="mt-1 text-sm text-[#7c725f]">{booking.therapist?.name || 'Aviana therapist'} · {booking.therapist?.gender === 'female' ? 'Woman' : 'Man'}</p><p className="mt-1 text-sm text-[#7c725f]">{prettyDate(booking.date)} · {booking.time} · {booking.durationMinutes} min</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9b9184]">{booking.bookingType === 'home' ? booking.homeAddress : booking.spaAddress}</p>{extras.length > 0 && <p className="mt-3 text-xs text-[#7c725f]">Extras: {extras.map((extra) => extra.name).join(' · ')}</p>}</div><div className="shrink-0 sm:text-right"><p className="font-serif text-xl">{money(booking.totalAmount ?? booking.price)}</p><p className="mt-1 text-xs text-[#7c725f]">Paid {money(booking.paidAmount)}</p>{outstandingBalance && <p className="mt-1 text-xs text-[#8f7042]">Remaining {money(booking.remainingAmount)}</p>}</div></div><div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#eee8df] pt-4"><Link to={`/dashboard/bookings/${booking._id}`} className="text-[10px] tracking-[0.18em] text-[#201e1a]">VIEW DETAILS →</Link>{canPayInitial && <Link to={`/dashboard/bookings/${booking._id}`} className="bg-[#b08d57] px-4 py-2 text-[10px] tracking-[0.18em] text-white">PAY NOW</Link>}{canReschedule && <Link to={`/dashboard/bookings/${booking._id}/reschedule`} className="text-[10px] tracking-[0.18em] text-[#8f7042]">RESCHEDULE</Link>}{canCancel && <button onClick={() => onCancel(booking._id)} className="text-[10px] tracking-[0.18em] text-red-500">CANCEL</button>}</div></div></div></article>;
}
function Empty({ tab }) { return <div className="border border-black/5 bg-white p-10 text-center sm:p-14"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3ede4] font-serif text-2xl text-[#8f7042]">A</div><h2 className="mt-5 font-serif text-3xl">No {tab} bookings</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#7c725f]">Your next relaxing experience is waiting for you.</p><Link to="/services" className="mt-6 inline-flex bg-[#201e1a] px-6 py-4 text-[10px] tracking-[0.18em] text-white">EXPLORE OUR TREATMENTS</Link></div>; }
function Skeleton() { return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="grid animate-pulse md:grid-cols-[150px_1fr]"><div className="min-h-[190px] bg-[#eae3d9]"/><div className="space-y-4 border border-black/5 bg-white p-6"><div className="h-4 w-20 bg-[#eee8df]"/><div className="h-7 w-1/2 bg-[#eee8df]"/><div className="h-4 w-1/3 bg-[#eee8df]"/></div></div>)}</div>; }
