import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { money, prettyDate } from '../../utils/format';
import Reveal from '../About/shared/Reveal';
import MediaImage from '../../components/MediaImage';
import ExtraServicesStep from './ExtraServicesStep';
import PaymentOptionStep from './PaymentOptionStep';
import { createInitialOrder, openRazorpay, verifyRazorpayPaymentWithRecovery } from '../../services/paymentService';
import { showError, showInfo, showSuccess, showToast } from '../../utils/alerts';

const draftKey = 'aviana_booking_draft';
const bookingIdKey = 'aviana_pending_booking_id';

const empty = {
  serviceId: '', therapistGender: 'any', therapistId: '', bookingType: 'spa',
  date: '', time: '', customerName: '', customerEmail: '', customerPhone: '',
  spaAddress: '', homeAddress: '', notes: '',
};

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export default function BookingForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState({ fullPaymentDiscountEnabled: false, fullPaymentDiscountPercent: 0, fullPaymentDiscountMaxAmount: null, bookingOption: null });
  const [homeVisitFee, setHomeVisitFee] = useState(500);
  const [spaAddress, setSpaAddress] = useState('');
  const [values, setValues] = useState(empty);
  const [selectedExtraIds, setSelectedExtraIds] = useState([]);
  const [paymentType, setPaymentType] = useState('FULL');
  const [pricing, setPricing] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quoteError, setQuoteError] = useState('');
  const [booking, setBooking] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const paymentSuccessRef = useRef(false);

  const selected = useMemo(() => services.find((service) => service._id === values.serviceId), [services, values.serviceId]);
  const selectedTherapist = useMemo(() => therapists.find((therapist) => therapist._id === values.therapistId), [therapists, values.therapistId]);
  const selectedExtras = useMemo(() => extraServices.filter((item) => selectedExtraIds.includes(item._id)), [extraServices, selectedExtraIds]);
  const localPricing = useMemo(() => {
    const base = selected ? Number(values.bookingType === 'home' ? selected.homePrice : selected.spaPrice) + Number(values.bookingType === 'home' ? homeVisitFee : 0) : 0;
    const extrasTotal = selectedExtras.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const subtotal = Math.round(base + extrasTotal);
    const discountPercentage = paymentType === 'FULL' && paymentOptions.fullPaymentDiscountEnabled ? Number(paymentOptions.fullPaymentDiscountPercent || 0) : 0;
    let discountAmount = Math.round(subtotal * discountPercentage / 100);
    if (paymentOptions.fullPaymentDiscountMaxAmount > 0) discountAmount = Math.min(discountAmount, Number(paymentOptions.fullPaymentDiscountMaxAmount));
    if (paymentType !== 'FULL') discountAmount = 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);
    const fixedBookingAmount = Number(paymentOptions.bookingOption?.price || 0);
    const initialAmount = paymentType === 'FULL' ? totalAmount : fixedBookingAmount;
    return { baseServiceAmount: Math.round(base), extrasTotal: Math.round(extrasTotal), subtotal, discountPercentage, discountAmount, totalAmount, initialAmount, remainingAmount: Math.max(0, totalAmount - initialAmount), bookingAmount: paymentType === 'BOOKING' ? fixedBookingAmount : 0, paymentType };
  }, [selected, values.bookingType, homeVisitFee, selectedExtras, paymentType, paymentOptions]);
  const displayPricing = pricing || localPricing;

  const therapistFromPageId = params.get('therapist') || '';

  useEffect(() => {
    const serviceUrl = therapistFromPageId ? `/services?therapistId=${encodeURIComponent(therapistFromPageId)}` : '/services';
    api.get(serviceUrl).then((response) => setServices(response.services || [])).catch((err) => {
      setServices([]);
      setError(err.message);
      if (therapistFromPageId) showError('Unable to load therapist services', err.message);
    });
    api.get('/extra-services').then((response) => setExtraServices(response.extraServices || [])).catch((err) => setError(err.message));
  }, [therapistFromPageId]);

  useEffect(() => {
    if (!user) return;
    api.get('/payments/options').then((response) => {
      const nextOptions = response.paymentOptions || {};
      setPaymentOptions(nextOptions);
      if (!nextOptions.bookingOption && paymentType === 'BOOKING') setPaymentType('FULL');
    }).catch(() => {});
  }, [user, paymentType]);

  useEffect(() => {
    if (params.get('therapist') && !values.therapistId) setValues((prev) => ({ ...prev, therapistId: params.get('therapist') }));
    if (!params.get('service') || values.serviceId || !services.length) return;
    const q = params.get('service').toLowerCase();
    const match = services.find((service) => service.slug === q || service.title.toLowerCase() === q || service._id === q);
    if (match) setValues((prev) => ({ ...prev, serviceId: match._id }));
  }, [params, services, values.serviceId, values.therapistId]);

  useEffect(() => {
    if (!user) return;
    setValues((prev) => ({ ...prev, customerName: prev.customerName || user.fullName, customerEmail: user.email, customerPhone: prev.customerPhone || user.phone || '', homeAddress: prev.homeAddress || user.address || '' }));
  }, [navigate, user]);

  const resetBookingFlow = useCallback((message = '') => {
    sessionStorage.removeItem(draftKey);
    sessionStorage.removeItem(`${draftKey}:extras`);
    sessionStorage.removeItem(`${draftKey}:paymentType`);
    sessionStorage.removeItem(bookingIdKey);
    setLoading(false);
    setBooking(null);
    setPricing(null);
    setSelectedExtraIds([]);
    setPaymentType('FULL');
    setValues({
      ...empty,
      customerName: user?.fullName || '',
      customerEmail: user?.email || '',
      customerPhone: user?.phone || '',
      homeAddress: user?.address || '',
    });
    setStep(1);
    setConfirmed(false);
    setError('');
    setQuoteError('');
    setSuccessMessage(message);
    navigate('/booking', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (message) window.setTimeout(() => setSuccessMessage(''), 6000);
  }, [navigate, user]);

  const freshStartHandledRef = useRef('');

  useEffect(() => {
    if (params.get('new') !== '1' || freshStartHandledRef.current) return;
    freshStartHandledRef.current = true;
    const hadUnfinishedDraft = Boolean(sessionStorage.getItem(draftKey) || sessionStorage.getItem(bookingIdKey));
    sessionStorage.removeItem(draftKey);
    sessionStorage.removeItem(`${draftKey}:extras`);
    sessionStorage.removeItem(`${draftKey}:paymentType`);
    sessionStorage.removeItem(bookingIdKey);
    setBooking(null);
    setPricing(null);
    setSelectedExtraIds([]);
    setPaymentType('FULL');
    setValues({
      ...empty,
      customerName: user?.fullName || '',
      customerEmail: user?.email || '',
      customerPhone: user?.phone || '',
      homeAddress: user?.address || '',
    });
    setStep(1);
    setConfirmed(false);
    setError('');
    setQuoteError('');

    const cleanParams = new URLSearchParams(location.search);
    cleanParams.delete('new');
    navigate({ pathname: '/booking', search: cleanParams.toString() ? `?${cleanParams.toString()}` : '' }, { replace: true });

    if (hadUnfinishedDraft) {
      showToast('Previous unfinished appointment cleared. Any saved pending booking is still available in My Bookings.', 'info');
    }
  }, [location.search, navigate, params, user]);

  useEffect(() => {
    if (!values.serviceId || !values.date) return;
    setLoading(true); setError('');
    const qs = new URLSearchParams({ serviceId: values.serviceId, date: values.date, therapistGender: values.therapistGender, bookingType: values.bookingType });
    if (values.therapistId) qs.set('therapistId', values.therapistId);
    api.get(`/availability?${qs}`).then((response) => {
      setTherapists(response.therapists || []); setSlots(response.slots || []); setHomeVisitFee(Number(response.homeVisitFee ?? 500)); setSpaAddress(response.spaAddress || '');
    }).catch((err) => { setSlots([]); setTherapists([]); setError(err.message); }).finally(() => setLoading(false));
  }, [values.serviceId, values.date, values.therapistGender, values.bookingType, values.therapistId]);

  useEffect(() => {
    if (values.time && slots.length && !slots.some((slot) => slot.time === values.time)) setValues((prev) => ({ ...prev, time: '' }));
  }, [slots, values.time]);

  useEffect(() => {
    if (!user || !selected || step < 4) return;
    setQuoteError('');
    api.post('/bookings/quote', { serviceId: selected._id, therapistId: values.therapistId || undefined, bookingType: values.bookingType, extraServiceIds: selectedExtraIds, paymentType })
      .then((response) => setPricing(response.pricing))
      .catch((err) => setQuoteError(err.message));
  }, [user, selected, values.therapistId, values.bookingType, selectedExtraIds, paymentType, step]);

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const toggleExtra = (id) => setSelectedExtraIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);

  const next = () => {
    setError('');
    if (step === 1 && !values.serviceId) { setError('Choose a service first.'); showInfo('Choose a treatment', 'Please select a service before continuing.'); return; }
    if (step === 2 && (!values.date || !values.time)) { setError('Choose a date and an available time.'); showInfo('Appointment details needed', 'Please choose a date and an available time.'); return; }
    if (step === 3) {
      if (!user) return setError('Please sign in or create an account before continuing.');
      if (!values.customerName.trim()) return setError('Your full name is required.');
      if (!values.customerPhone.trim()) return setError('Your phone number is required.');
      if (values.bookingType === 'home' && !values.homeAddress.trim()) return setError('Your home address is required.');
    }
    setStep((value) => Math.min(5, value + 1));
  };
  const back = () => setStep((value) => Math.max(1, value - 1));

  const startPayment = async () => {
    if (!user) return setError('Please sign in before payment.');
    if (!values.serviceId || !values.date || !values.time) return setError('Please complete your appointment details first.');
    setLoading(true); setError('');
    try {
      const quote = await api.post('/bookings/quote', { serviceId: values.serviceId, therapistId: values.therapistId || undefined, bookingType: values.bookingType, extraServiceIds: selectedExtraIds, paymentType });
      setPricing(quote.pricing);
      let current = booking;
      if (!current) {
        const result = await api.post('/bookings', { ...values, paymentType, extraServiceIds: selectedExtraIds });
        current = result.booking;
        setBooking(current);
        sessionStorage.setItem(bookingIdKey, current._id);
      } else if (['PAID', 'PARTIAL'].includes(String(current.paymentStatus || '').toUpperCase())) {
        resetBookingFlow('Your booking is already confirmed. Your reservation is saved in My Bookings.');
        return;
      } else if (current.bookingStatus === 'cancelled') {
        resetBookingFlow('This payment session expired. Please choose a new appointment time.');
        return;
      }

      const order = await createInitialOrder(current._id);
      paymentSuccessRef.current = false;
      await openRazorpay({
        order: order.order,
        keyId: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        description: current.service?.title || selected?.title || 'Aviana appointment',
        prefill: { name: current.customerName, email: current.customerEmail, contact: current.customerPhone },
        onDismiss: () => {
          if (!paymentSuccessRef.current) {
            setLoading(false);
            setError('Payment window was closed. Your selected slot is still reserved for a short time; you can retry payment.');
            showInfo('Payment window closed', 'Your booking is still available. Open it from My Bookings to retry payment.');
          }
        },
        onSuccess: async (response) => {
          paymentSuccessRef.current = true;
          try {
            await verifyRazorpayPaymentWithRecovery(response, current._id);
            await showSuccess('Booking confirmed', 'Your reservation is saved in My Bookings.');
            resetBookingFlow();
          } catch (err) {
            setError(err.message);
            setLoading(false);
            paymentSuccessRef.current = false;
          }
        },
        onFailure: (response) => {
          paymentSuccessRef.current = false;
          const reason = response?.error?.description || 'The payment attempt was not completed.';
          setError(`${reason} You can retry without creating another booking.`);
          showError('Payment not completed', `${reason} You can retry this booking from My Bookings.`);
          setLoading(false);
        },
      });
    } catch (err) { setError(err.message); showError('Unable to start payment', err.message); setLoading(false); }
  };

  if (confirmed) return <Confirmed booking={booking} />;

  return (
    <Reveal>
      <div>
        <div className="mb-8 flex gap-2">{[1,2,3,4,5].map((number) => <span key={number} className={`h-1 flex-1 transition ${step >= number ? 'bg-[#b08d57]' : 'bg-[#e1dbd2]'}`} />)}</div>
        <div className="mb-8 flex items-center justify-between gap-4"><p className="text-[10px] uppercase tracking-[0.2em] text-[#b08d57]">Step {step} of 5</p>{selected && <p className="text-right text-xs text-[#7c725f]">{selected.title} · {selected.durationMinutes} min</p>}</div>
        {successMessage && <div className="mb-6 border border-[#dfd1bc] bg-[#f8f3eb] px-4 py-3 text-sm text-[#6f5a3b]">{successMessage}</div>}
        {error && <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {quoteError && step >= 4 && <div className="mb-6 border border-[#e3d8c8] bg-[#faf6ef] px-4 py-3 text-sm text-[#765d39]">Pricing is being refreshed from the server. The final amount is re-checked before payment.</div>}

        {step === 1 && <ServiceStep services={services} selected={values.serviceId} therapistLocked={Boolean(therapistFromPageId)} choose={(id) => { setValues((prev) => ({ ...prev, serviceId: id, time: '', therapistId: therapistFromPageId || prev.therapistId })); setPricing(null); }} />}
        {step === 2 && <ScheduleStep values={values} therapists={therapists} slots={slots} loading={loading} setValues={setValues} set={set} minDate={todayISO()} lockedTherapistId={therapistFromPageId} />}
        {step === 3 && <CustomerStep values={values} user={user} spaAddress={spaAddress} set={set} />}
        {step === 4 && <ExtraServicesStep items={extraServices} selectedIds={selectedExtraIds} toggle={toggleExtra} />}
        {step === 5 && <PaymentOptionStep values={values} selected={selected} therapist={selectedTherapist} extras={selectedExtras} pricing={displayPricing} homeFee={values.bookingType === 'home' ? homeVisitFee : 0} paymentOptions={paymentOptions} paymentType={paymentType} setPaymentType={(value) => { setPaymentType(value); setPricing(null); }} />}

        {step === 3 && !user && <div className="mt-8 border border-[#ded7cc] bg-white p-6"><p className="text-sm leading-6 text-[#7c725f]">A client account is required before payment so your booking and receipts stay together.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/login?returnTo=/booking" className="bg-[#201e1a] px-5 py-3 text-[10px] tracking-[0.18em] text-white">SIGN IN</Link><Link to="/register?returnTo=/booking" className="border border-[#d8d0c3] px-5 py-3 text-[10px] tracking-[0.18em]">CREATE ACCOUNT</Link></div></div>}

        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 1 ? <button type="button" onClick={back} disabled={loading} className="border border-[#d8d0c3] px-6 py-4 text-[10px] tracking-[0.18em] transition hover:bg-[#f7f3ed] disabled:opacity-40">BACK</button> : <span />}
          {step < 5 ? <button type="button" onClick={next} disabled={loading} className="bg-[#201e1a] px-7 py-4 text-[10px] tracking-[0.18em] text-white transition hover:bg-[#332f29] disabled:opacity-40">CONTINUE</button> : <button type="button" disabled={loading || displayPricing.totalAmount <= 0} onClick={startPayment} className="bg-[#b08d57] px-7 py-4 text-[10px] tracking-[0.18em] text-white transition hover:bg-[#9e7e4e] disabled:opacity-50">{loading ? 'OPENING CHECKOUT…' : `PAY ${money(displayPricing.initialAmount)}`}</button>}
        </div>
      </div>
    </Reveal>
  );
}

function ServiceStep({ services, selected, choose, therapistLocked = false }) {
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="font-serif text-3xl">Choose your treatment.</h2><p className="mt-2 text-sm text-[#7c725f]">{therapistLocked ? 'Showing only treatments offered by your selected therapist.' : 'Select the ritual that feels right today.'}</p></div>
      {therapistLocked && <span className="border border-[#ded6ca] bg-[#f8f3eb] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[#7a6240]">Therapist-specific services</span>}
    </div>
    {services.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2">{services.map((service) => {
      const active = selected === service._id;
      return <button key={service._id} type="button" onClick={() => choose(service._id)} className={`group overflow-hidden border text-left transition-all ${active ? 'border-[#8d6a39] bg-[#f1e4cf] shadow-[0_18px_45px_rgba(91,67,36,0.14)] ring-1 ring-[#b08d57]/30' : 'border-[#e3ddd4] bg-white hover:-translate-y-0.5 hover:border-[#b08d57]/55 hover:shadow-[0_14px_30px_rgba(55,43,28,0.06)]'}`}>{active && <span className="absolute right-3 top-3 z-20 rounded-full bg-[#201e1a] px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white">✓ Selected</span>}<div className="relative aspect-[5/3] overflow-hidden"><MediaImage src={service.image} name={service.title} alt={service.title} wrapperClassName="h-full w-full" className={`h-full w-full object-cover transition-transform duration-500 ${active ? 'scale-[1.02]' : 'group-hover:scale-[1.03]'}`} />{active && <div className="absolute inset-0 bg-[#6f512c]/10" />}</div><div className={`p-5 ${active ? 'bg-[#f1e4cf]' : 'bg-white'}`}><p className="text-[10px] uppercase tracking-[0.16em] text-[#b08d57]">{service.category}</p><h3 className="mt-2 font-serif text-xl text-[#201e1a]">{service.title}</h3><p className="mt-2 text-xs leading-5 text-[#7c725f]">{service.durationMinutes} min · From {money(service.spaPrice)}</p><div className="mt-4 flex items-center justify-end"><span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${active ? 'border-[#8d6a39] bg-[#201e1a] text-white' : 'border-[#ded7cc] text-transparent'}`}>✓</span></div></div></button>;
    })}</div> : <div className="mt-7 border border-[#ded7cc] bg-white p-8 text-center"><h3 className="font-serif text-2xl">No treatments are assigned to this therapist.</h3><p className="mt-2 text-sm leading-6 text-[#7c725f]">Please return to the therapist profile and choose one of their listed treatments.</p></div>}
  </section>;
}

function ScheduleStep({ values, therapists, slots, loading, setValues, set, minDate, lockedTherapistId }) {
  const lockedTherapist = therapists.find((therapist) => therapist._id === lockedTherapistId) || therapists.find((therapist) => therapist._id === values.therapistId);
  const keepTherapist = (next) => lockedTherapistId ? { ...next, therapistId: lockedTherapistId } : next;
  return <section className="space-y-7"><h2 className="font-serif text-3xl">Choose how you would like to be cared for.</h2><div className="grid gap-5 sm:grid-cols-2"><Choice active={values.bookingType === 'spa'} onClick={() => setValues((prev) => keepTherapist({ ...prev, bookingType: 'spa', time: '' }))} title="Spa visit" text="Come into our sanctuary in Jaipur." /><Choice active={values.bookingType === 'home'} onClick={() => setValues((prev) => keepTherapist({ ...prev, bookingType: 'home', time: '' }))} title="Home massage" text="We bring the ritual to your chosen address." /></div>{lockedTherapistId ? <div className="border border-[#ded6ca] bg-[#f8f3eb] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Selected therapist</p>{lockedTherapist ? <div className="mt-3 flex items-center gap-3"><MediaImage src={lockedTherapist.profileImage} name={lockedTherapist.name} alt={lockedTherapist.name} wrapperClassName="h-14 w-12 shrink-0" className="h-full w-full object-cover"/><div><p className="font-serif text-lg">{lockedTherapist.name}</p><p className="mt-1 text-xs text-[#7c725f]">{lockedTherapist.specialization || lockedTherapist.skills?.join(' · ')}</p></div></div> : <p className="mt-3 text-sm text-[#7c725f]">Loading your selected therapist…</p>}<p className="mt-3 text-xs leading-5 text-[#7c725f]">Your treatment list is restricted to services offered by this therapist.</p></div> : <div><label className="text-[10px] uppercase tracking-[0.18em] text-[#7c725f]">Therapist preference</label><select value={values.therapistGender} onChange={(e) => setValues((prev) => ({ ...prev, therapistGender: e.target.value, therapistId: '', time: '' }))} className="mt-2 w-full border-b border-[#d7d0c5] bg-transparent py-3 text-sm outline-none focus:border-[#b08d57]"><option value="any">Any therapist</option><option value="female">Female therapist</option><option value="male">Male therapist</option></select></div>}<div><label className="text-[10px] uppercase tracking-[0.18em] text-[#7c725f]">Date</label><input type="date" min={minDate} value={values.date} onChange={(e) => setValues((prev) => keepTherapist({ ...prev, date: e.target.value, time: '' }))} className="mt-2 w-full border-b border-[#d7d0c5] bg-transparent py-3 text-sm outline-none focus:border-[#b08d57]" /></div>{!lockedTherapistId && therapists.length > 0 && <div><p className="text-[10px] uppercase tracking-[0.18em] text-[#7c725f]">Specific therapist (optional)</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{therapists.map((therapist) => { const active = values.therapistId === therapist._id; return <button type="button" key={therapist._id} onClick={() => setValues((prev) => ({ ...prev, therapistId: therapist._id, time: '' }))} className={`border p-4 text-left transition ${active ? 'border-[#8d6a39] bg-[#f1e4cf] shadow-sm' : 'border-[#e3ddd4] bg-white hover:border-[#b08d57]/60'}`}><div className="flex items-center gap-3"><MediaImage src={therapist.profileImage} name={therapist.name} alt={therapist.name} wrapperClassName="h-14 w-12 shrink-0" className="h-full w-full object-cover"/><div className="min-w-0"><p className="font-serif text-lg">{therapist.name}</p><p className="mt-1 text-xs text-[#7c725f]">{therapist.specialization || therapist.skills?.join(' · ')}</p></div>{active && <span className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#201e1a] text-xs text-white">✓</span>}</div></button>; })}</div></div>}{values.date && <div><p className="text-[10px] uppercase tracking-[0.18em] text-[#7c725f]">Available times</p>{loading ? <p className="mt-3 text-sm text-[#7c725f]">Finding open rooms…</p> : <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map((slot) => { const active = values.time === slot.time; return <button type="button" key={slot.time} onClick={() => set('time', slot.time)} className={`border px-3 py-3 text-xs transition ${active ? 'border-[#8d6a39] bg-[#f1e4cf] font-medium text-[#5d4628] ring-1 ring-[#b08d57]/30' : 'border-[#ded7cc] bg-white hover:border-[#b08d57]'}`}>{slot.time}</button>; })}{!slots.length && <p className="col-span-full text-sm text-[#7c725f]">No matching slots for this date. Try another day.</p>}</div>}</div>}</section>;
}

function CustomerStep({ values, user, spaAddress, set }) {
  if (!user) return <section><h2 className="font-serif text-3xl">Sign in to continue.</h2></section>;
  return <section className="space-y-7"><h2 className="font-serif text-3xl">Tell us who we are welcoming.</h2><div className="grid gap-7 sm:grid-cols-2"><Field label="Full name" value={values.customerName} onChange={(e) => set('customerName', e.target.value)} /><Field label="Email" type="email" value={values.customerEmail} readOnly /><Field label="Phone" value={values.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />{values.bookingType === 'spa' ? <div className="sm:col-span-2"><Field label="Spa location" value={values.spaAddress || spaAddress} onChange={(e) => set('spaAddress', e.target.value)} placeholder={spaAddress || 'Aviana Wellness, Jaipur'} /></div> : <div className="sm:col-span-2"><Field label="Home address" value={values.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} placeholder="Full address with landmark" /></div>}<div className="sm:col-span-2"><Field label="Notes" value={values.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Preferences or anything your therapist should know" /></div></div></section>;
}

function Confirmed({ booking }) {
  const extras = booking?.extraServices || [];
  const status = String(booking?.paymentStatus || '').toUpperCase();
  const bookingAmountPaid = booking?.paymentType === 'BOOKING' && Number(booking?.remainingAmount || 0) > 0;
  return <div className="border border-[#dfd5c6] bg-white p-8 text-center"><p className="text-[10px] uppercase tracking-[0.2em] text-[#b08d57]">Reservation confirmed</p><h2 className="mt-4 font-serif text-4xl">Your ritual is reserved.</h2><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#7c725f]">A confirmation has been sent to {booking?.customerEmail}. We look forward to welcoming you.</p>{bookingAmountPaid ? <div className="mx-auto mt-6 max-w-xl border border-[#e4dacb] bg-[#f8f3eb] p-5 text-left text-sm text-[#6f5a3b]"><strong>Booking amount paid.</strong> Remaining {money(booking.remainingAmount)} is payable after your service.</div> : status === 'PAID' ? <div className="mx-auto mt-6 max-w-xl border border-[#e4dacb] bg-[#f8f3eb] p-5 text-left text-sm text-[#6f5a3b]">Full payment completed.</div> : null}<div className="mx-auto mt-7 max-w-xl border border-[#ede8df] p-6 text-left text-sm"><p className="text-[10px] uppercase tracking-[0.16em] text-[#b08d57]">Booking {String(booking?._id || '').slice(-8).toUpperCase()}</p><p className="mt-3 font-serif text-2xl">{booking?.service?.title}</p><p className="mt-2 text-[#7c725f]">{prettyDate(booking?.date)} · {booking?.time} · {booking?.therapist?.name}</p><p className="mt-1 text-[#7c725f]">{booking?.bookingType === 'home' ? booking?.homeAddress : booking?.spaAddress}</p><div className="mt-5 space-y-2 border-t border-[#eee8df] pt-5"><PriceLine label="Subtotal" value={money(booking?.subtotal)} /><PriceLine label="Discount" value={booking?.discountAmount ? `− ${money(booking.discountAmount)}` : money(0)} />{extras.map((extra) => <PriceLine key={`${extra.serviceId}-${extra.name}`} label={extra.name} value={money(extra.price)} />)}<PriceLine label="Total" value={money(booking?.totalAmount ?? booking?.price)} strong /><PriceLine label="Paid" value={money(booking?.paidAmount)} /><PriceLine label="Remaining" value={money(booking?.remainingAmount)} /><PriceLine label="Payment" value={`${booking?.paymentType} · ${booking?.paymentStatus}`} /></div></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to={`/dashboard/bookings/${booking?._id}`} className="bg-[#201e1a] px-6 py-4 text-[10px] tracking-[0.18em] text-white">VIEW BOOKING</Link><Link to="/" className="border border-[#d8d0c3] px-6 py-4 text-[10px] tracking-[0.18em]">RETURN HOME</Link></div></div>;
}
function PriceLine({ label, value, strong = false }) { return <div className="flex items-center justify-between gap-4"><span className="text-[#7c725f]">{label}</span><span className={strong ? 'font-serif text-lg' : 'font-medium'}>{value}</span></div>; }
function Choice({ active, onClick, title, text }) { return <button type="button" onClick={onClick} aria-pressed={active} className={`border p-6 text-left transition-all duration-300 ${active ? 'border-[#8d6a39] bg-[#f1e4cf] shadow-sm ring-1 ring-[#b08d57]/30' : 'border-[#e3ddd4] bg-white hover:border-[#b08d57]/60 hover:shadow-sm'}`}><div className="flex items-start justify-between gap-4"><div><p className="font-serif text-xl">{title}</p><p className="mt-2 text-sm leading-6 text-[#7c725f]">{text}</p></div><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${active ? 'border-[#8d6a39] bg-[#201e1a] text-white' : 'border-[#ded7cc] text-transparent'}`}>✓</span></div></button>; }
function Field({ label, ...props }) { return <label className="block space-y-2"><span className="text-[10px] uppercase tracking-[0.18em] text-[#7c725f]">{label}</span><input {...props} className="w-full border-b border-[#d7d0c5] bg-transparent py-3 text-sm outline-none transition focus:border-[#b08d57]" /></label>; }
