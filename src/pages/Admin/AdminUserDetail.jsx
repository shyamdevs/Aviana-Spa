import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { adminApi } from '../../store/AdminContext';
import { money, prettyDate, titleCase } from '../../utils/format';

export default function AdminUserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.get(`/users/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <AdminLayout><p className="text-sm text-red-400">{error}</p></AdminLayout>;
  if (!data) return <AdminLayout><p className="text-sm text-white/50">Loading user…</p></AdminLayout>;
  const toggleBlock = async () => {
    const reason = !data.user.isBlocked ? window.prompt(`Reason for blocking ${data.user.fullName}:`, 'Blocked by Aviana administration') : '';
    if (!data.user.isBlocked && reason === null) return;
    setBusy(true); setError('');
    try { const response = await adminApi.patch(`/users/${id}/${data.user.isBlocked ? 'unblock' : 'block'}`, { reason: reason || '' }); setData((prev) => ({ ...prev, user: response.user })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const { user, bookings, payments = [] } = data;
  return <AdminLayout>
    <div className="mb-8 flex items-start justify-between gap-5">
      <div><p className="text-[10px] uppercase tracking-[0.22em] text-[#b08d57]">Client profile</p><h1 className="mt-2 font-serif text-4xl">{user.fullName}</h1><p className="mt-2 text-sm text-white/45">{user.email}</p></div>
      <Link to="/admin/users" className="text-[10px] tracking-[0.18em] text-[#b08d57]">← USERS</Link>
    </div>
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="border border-white/10 bg-[#1d1b17] p-6 space-y-4 text-sm">
        <Info label="Email" value={user.email}/><Info label="Phone" value={user.phone}/><Info label="City" value={user.city}/><Info label="Pincode" value={user.pincode}/><Info label="Gender" value={titleCase(user.gender)}/><Info label="Joined" value={prettyDate(user.createdAt)}/><Info label="Status" value={user.isBlocked ? 'Blocked' : 'Active'}/>{user.blockedReason&&<Info label="Block reason" value={user.blockedReason}/>}<button type="button" disabled={busy} onClick={toggleBlock} className={`mt-2 min-h-11 w-full px-4 text-[10px] tracking-[0.16em] disabled:opacity-50 ${user.isBlocked?'border border-[#b08d57] text-[#b08d57]':'bg-[#b08d57] text-white'}`}>{busy?(user.isBlocked?'UNBLOCKING…':'BLOCKING…'):(user.isBlocked?'UNBLOCK USER':'BLOCK USER')}</button>
        <div><p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Address</p><p className="mt-2 leading-6 text-white/70">{user.address || '—'}</p></div>
      </section>
      <section><h2 className="mb-4 font-serif text-2xl">Booking history</h2><div className="space-y-3">{bookings.map((booking) => <article key={booking._id} className="border border-white/10 bg-[#1d1b17] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="font-serif text-xl">{booking.service?.title}</p><p className="mt-1 text-sm text-white/45">{prettyDate(booking.date)} · {booking.time} · {booking.therapist?.name}</p><p className="mt-1 text-xs text-white/35">{booking.bookingType === 'home' ? booking.homeAddress : booking.spaAddress}</p></div><div className="text-right"><p className="font-serif text-lg">{money(booking.price)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#b08d57]">{titleCase(booking.bookingStatus)}</p></div></div></article>)}{!bookings.length&&<div className="border border-white/10 bg-[#1d1b17] p-6 text-sm text-white/45">No bookings for this client.</div>}</div></section>
      <section className="mt-8 lg:col-span-2"><h2 className="mb-4 font-serif text-2xl">Payment history</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{payments.map((payment)=><article key={payment._id} className="border border-white/10 bg-[#1d1b17] p-5"><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">{prettyDate(payment.createdAt)}</p><p className="mt-2 font-serif text-xl">{money(payment.amount)}</p><p className="mt-1 text-xs text-[#b08d57]">{titleCase(payment.status)}</p><p className="mt-2 break-all font-mono text-[10px] text-white/35">{payment.paymentId || payment.orderId}</p></article>)}</div>{!payments.length&&<div className="border border-white/10 bg-[#1d1b17] p-6 text-sm text-white/45">No payments for this client.</div>}</section>
    </div>
  </AdminLayout>;
}

function Info({ label, value }) {
  return <div><p className="text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</p><p className="mt-1 text-white/75">{value || '—'}</p></div>;
}
