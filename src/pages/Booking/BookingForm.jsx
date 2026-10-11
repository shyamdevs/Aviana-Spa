import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { money, prettyDate } from '../../utils/format';
import Reveal from '../About/shared/Reveal';
import MediaImage from '../../components/MediaImage';
import ExtraServicesStep from './ExtraServicesStep';
import PaymentOptionStep from './PaymentOptionStep';
import BookingActionBar from './BookingActionBar';
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
  // Synchronous guard: `loading` state lags a render behind, so a fast double-tap on Pay
  // could otherwise start two checkouts.
  const payingRef = useRef(false);
  const topRef = useRef(null);
  const firstStepRender = useRef(true);

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
    payingRef.current = false;
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

  // Moving between steps: bring the top of the new step into view, but only when the user has
  // scrolled away from it, so short steps do not jump around.
  useEffect(() => {
    if (firstStepRender.current) { firstStepRender.current = false; return; }
    const el = topRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 80 || top > window.innerHeight * 0.6) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [step]);

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
    if (payingRef.current) return;
    payingRef.current = true;
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
            payingRef.current = false;
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
            payingRef.current = false;
            setLoading(false);
            paymentSuccessRef.current = false;
          }
        },
        onFailure: (response) => {
          paymentSuccessRef.current = false;
          payingRef.current = false;
          const reason = response?.error?.description || 'The payment attempt was not completed.';
          setError(`${reason} You can retry without creating another booking.`);
          showError('Payment not completed', `${reason} You can retry this booking from My Bookings.`);
          setLoading(false);
        },
      });
    } catch (err) { payingRef.current = false; setError(err.message); showError('Unable to start payment', err.message); setLoading(false); }
  };

  // Per-step "can the guest continue?" state. This only drives the button state and the hint line;
  // `next()` still re-validates, and the server re-validates everything on booking/payment.
  const stepStatus = (() => {
    if (step === 1) return values.serviceId ? { ok: true, hint: selected ? `${selected.title} selected` : '' } : { ok: false, hint: 'Choose a treatment to continue' };
    if (step === 2) {
      if (!values.date) return { ok: false, hint: 'Pick a date to see available times' };
      if (loading) return { ok: false, hint: 'Finding available times…' };
      if (!values.time) return { ok: false, hint: slots.length ? 'Pick an available time' : 'No times on this date. Try another day' };
      return { ok: true, hint: `${prettyDate(values.date)} at ${values.time}` };
    }
    if (step === 3) {
      if (!user) return { ok: false, hint: 'Sign in to continue' };
      if (!values.customerName.trim()) return { ok: false, hint: 'Enter your full name' };
      if (!values.customerPhone.trim()) return { ok: false, hint: 'Enter your phone number' };
      if (values.bookingType === 'home' && !values.homeAddress.trim()) return { ok: false, hint: 'Enter your home address' };
      return { ok: true, hint: '' };
    }
    if (step === 4) return { ok: true, hint: selectedExtras.length ? `${selectedExtras.length} extra${selectedExtras.length > 1 ? 's' : ''} added` : 'Extras are optional' };
    const due = Number(displayPricing.remainingAmount || 0);
    return { ok: Number(displayPricing.totalAmount) > 0, hint: `Total ${money(displayPricing.totalAmount)}${paymentType === 'BOOKING' && due > 0 ? `. ${money(due)} due after your service` : ''}` };
  })();

  if (confirmed) return <Confirmed booking={booking} />;

  const primaryBtn = 'inline-flex min-h-12 items-center justify-center bg-[#b08d57] px-7 text-[11px] font-semibold tracking-[0.18em] text-[#1f1a14] transition hover:bg-[#c29d59] disabled:cursor-not-allowed disabled:bg-[#e6e0d6] disabled:text-[#8a8173]';
  const secondaryBtn = 'inline-flex min-h-12 items-center justify-center border border-[#cfc6b8] bg-white px-6 text-[11px] font-semibold tracking-[0.18em] text-[#201e1a] transition hover:bg-[#f7f3ed] disabled:opacity-40';

  // The same controls are rendered in the mobile sticky bar and in the inline desktop row.
  // Only one of the two is ever visible (md breakpoint), the other is display:none.
  const actions = (
    <>
      {step > 1 && <button type="button" onClick={back} disabled={loading} className={secondaryBtn}>BACK</button>}
      {step < 5
        ? <button type="button" onClick={next} disabled={loading || !stepStatus.ok} className={`${primaryBtn} flex-1 md:ml-auto md:flex-none`}>CONTINUE</button>
        : <button type="button" disabled={loading || !stepStatus.ok} onClick={startPayment} className={`${primaryBtn} flex-1 md:ml-auto md:flex-none`}>{loading ? 'OPENING CHECKOUT…' : `PAY ${money(displayPricing.initialAmount)}`}</button>}
    </>
  );

  return (
    <Reveal>
      {/* Bottom padding keeps the last card/field clear of the mobile sticky bar. */}
      <div className="pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-0">
        <div ref={topRef} className="scroll-mt-24">
          <div aria-hidden="true" className="flex gap-1.5">{[1, 2, 3, 4, 5].map((number) => <span key={number} className={`h-1 flex-1 transition ${step >= number ? 'bg-[#b08d57]' : 'bg-[#e1dbd2]'}`} />)}</div>
          <div className="mb-6 mt-3 flex items-baseline justify-between gap-3 md:mb-8">
            <p className="shrink-0 text-xs font-medium text-[#7a6240]">Step {step} of 5: {stepNames[step - 1]}</p>
            {selected && <p className="min-w-0 truncate text-right text-xs text-[#7c725f]">{selected.title} · {selected.durationMinutes} min</p>}
          </div>
        </div>
        {successMessage && <div role="status" className="mb-6 border border-[#dfd1bc] bg-[#f8f3eb] px-4 py-3 text-sm text-[#6f5a3b]">{successMessage}</div>}
        {error && <div role="alert" className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {quoteError && step >= 4 && <div role="status" className="mb-6 border border-[#e3d8c8] bg-[#faf6ef] px-4 py-3 text-sm text-[#765d39]">Pricing is being refreshed from the server. The final amount is re-checked before payment.</div>}

        {step === 1 && <ServiceStep services={services} selected={values.serviceId} therapistLocked={Boolean(therapistFromPageId)} choose={(id) => { setValues((prev) => ({ ...prev, serviceId: id, time: '', therapistId: therapistFromPageId || prev.therapistId })); setPricing(null); }} />}
        {step === 2 && <ScheduleStep values={values} therapists={therapists} slots={slots} loading={loading} setValues={setValues} set={set} minDate={todayISO()} lockedTherapistId={therapistFromPageId} />}
        {step === 3 && <CustomerStep values={values} user={user} spaAddress={spaAddress} set={set} />}
        {step === 4 && <ExtraServicesStep items={extraServices} selectedIds={selectedExtraIds} toggle={toggleExtra} />}
        {step === 5 && <PaymentOptionStep values={values} selected={selected} therapist={selectedTherapist} extras={selectedExtras} pricing={displayPricing} homeFee={values.bookingType === 'home' ? homeVisitFee : 0} paymentOptions={paymentOptions} paymentType={paymentType} setPaymentType={(value) => { setPaymentType(value); setPricing(null); }} />}

        {step === 3 && !user && <div className="mt-8 border border-[#ded7cc] bg-white p-5 sm:p-6"><p className="text-sm leading-6 text-[#7c725f]">A client account is required before payment so your booking and receipts stay together.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Link to="/login?returnTo=/booking" className="inline-flex min-h-12 items-center justify-center bg-[#201e1a] px-6 text-[11px] font-semibold tracking-[0.18em] text-white">SIGN IN</Link><Link to="/register?returnTo=/booking" className="inline-flex min-h-12 items-center justify-center border border-[#cfc6b8] px-6 text-[11px] font-semibold tracking-[0.18em]">CREATE ACCOUNT</Link></div></div>}

        {/* Desktop / tablet: normal inline placement. */}
        <div className="mt-10 hidden items-center justify-between gap-3 md:flex">{actions}</div>
      </div>

      {/* Mobile: sticky bottom bar. */}
      <BookingActionBar hint={stepStatus.hint}>{actions}</BookingActionBar>
    </Reveal>
  );
}

const stepNames = ['Treatment', 'Schedule', 'Your details', 'Extras', 'Payment'];

const cardBase = 'border text-left transition-all';
const cardOn = 'border-[#8d6a39] bg-[#f1e4cf] ring-1 ring-[#b08d57]/30';
const cardOff = 'border-[#e3ddd4] bg-white hover:border-[#b08d57]/55';

function CheckDot({ active }) {
  return <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${active ? 'border-[#201e1a] bg-[#201e1a] text-white' : 'border-[#d8d0c3] text-transparent'}`}>✓</span>;
}

function ServiceStep({ services, selected, choose, therapistLocked = false }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl">Choose your treatment.</h2>
          <p className="mt-2 text-sm text-[#7c725f]">{therapistLocked ? 'Showing only treatments offered by your selected therapist.' : 'Select the ritual that feels right today.'}</p>
        </div>
        {therapistLocked && <span className="border border-[#ded6ca] bg-[#f8f3eb] px-3 py-2 text-xs text-[#7a6240]">Therapist-specific services</span>}
      </div>
      {services.length ? (
        <div className="mt-6 grid gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4">
          {services.map((service) => {
            const active = selected === service._id;
            return (
              <button key={service._id} type="button" onClick={() => choose(service._id)} aria-pressed={active} className={`group relative flex min-h-28 overflow-hidden sm:block sm:min-h-0 ${cardBase} ${active ? `${cardOn} shadow-[0_14px_36px_rgba(91,67,36,0.12)]` : `${cardOff} hover:shadow-[0_14px_30px_rgba(55,43,28,0.06)]`}`}>
                {active && <span className="absolute right-3 top-3 z-20 hidden rounded-full bg-[#201e1a] px-3 py-1.5 text-[10px] tracking-[0.1em] text-white sm:block">✓ Selected</span>}
                {/* Phones: compact row (photo left, details right) so more treatments fit on screen. */}
                <div className="relative w-28 shrink-0 overflow-hidden sm:aspect-[5/3] sm:w-auto">
                  <div className="absolute inset-0 sm:relative sm:inset-auto sm:h-full sm:w-full">
                    <MediaImage src={service.image} name={service.title} alt={service.title} wrapperClassName="h-full w-full" className={`h-full w-full object-cover transition-transform duration-500 ${active ? 'scale-[1.02]' : 'group-hover:scale-[1.03]'}`} />
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:block sm:p-5">
                  <div>
                    <p className="text-[11px] text-[#8d6a39]">{service.category}</p>
                    <h3 className="mt-1 font-serif text-lg leading-snug text-[#201e1a] sm:mt-2 sm:text-xl">{service.title}</h3>
                    <p className="mt-1 text-xs text-[#7c725f]">{service.durationMinutes} min</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
                    <p className="text-sm font-medium text-[#201e1a]"><span className="text-xs font-normal text-[#7c725f]">From </span>{money(service.spaPrice)}</p>
                    <CheckDot active={active} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-7 border border-[#ded7cc] bg-white p-6 text-center sm:p-8">
          <h3 className="font-serif text-2xl">No treatments are assigned to this therapist.</h3>
          <p className="mt-2 text-sm leading-6 text-[#7c725f]">Please return to the therapist profile and choose one of their listed treatments.</p>
        </div>
      )}
    </section>
  );
}

function ScheduleStep({ values, therapists, slots, loading, setValues, set, minDate, lockedTherapistId }) {
  const lockedTherapist = therapists.find((therapist) => therapist._id === lockedTherapistId) || therapists.find((therapist) => therapist._id === values.therapistId);
  const keepTherapist = (next) => lockedTherapistId ? { ...next, therapistId: lockedTherapistId } : next;
  const labelCls = 'text-xs font-medium text-[#6d655a]';
  const fieldCls = 'mt-2 min-h-12 w-full border-b border-[#d7d0c5] bg-transparent py-3 text-sm outline-none focus:border-[#b08d57]';
  return (
    <section className="space-y-7">
      <h2 className="font-serif text-2xl sm:text-3xl">Choose how you would like to be cared for.</h2>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
        <Choice active={values.bookingType === 'spa'} onClick={() => setValues((prev) => keepTherapist({ ...prev, bookingType: 'spa', time: '' }))} title="Spa visit" text="Come into our sanctuary in Jaipur." />
        <Choice active={values.bookingType === 'home'} onClick={() => setValues((prev) => keepTherapist({ ...prev, bookingType: 'home', time: '' }))} title="Home massage" text="We bring the ritual to your chosen address." />
      </div>

      {lockedTherapistId ? (
        <div className="border border-[#ded6ca] bg-[#f8f3eb] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#7a6240]">Selected therapist</p>
          {lockedTherapist ? (
            <div className="mt-3 flex items-center gap-3">
              <MediaImage src={lockedTherapist.profileImage} name={lockedTherapist.name} alt={lockedTherapist.name} wrapperClassName="h-14 w-12 shrink-0" className="h-full w-full object-cover" />
              <div className="min-w-0"><p className="font-serif text-lg">{lockedTherapist.name}</p><p className="mt-1 text-xs text-[#7c725f]">{lockedTherapist.specialization || lockedTherapist.skills?.join(' · ')}</p></div>
            </div>
          ) : <p className="mt-3 text-sm text-[#7c725f]">Loading your selected therapist…</p>}
          <p className="mt-3 text-xs leading-5 text-[#7c725f]">Your treatment list is restricted to services offered by this therapist.</p>
        </div>
      ) : (
        <div>
          <label htmlFor="booking-therapist-pref" className={labelCls}>Therapist preference</label>
          <select id="booking-therapist-pref" value={values.therapistGender} onChange={(e) => setValues((prev) => ({ ...prev, therapistGender: e.target.value, therapistId: '', time: '' }))} className={fieldCls}>
            <option value="any">Any therapist</option>
            <option value="female">Female therapist</option>
            <option value="male">Male therapist</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="booking-date" className={labelCls}>Date <span className="text-[#8d6a39]">(required)</span></label>
        <input id="booking-date" type="date" min={minDate} value={values.date} onChange={(e) => setValues((prev) => keepTherapist({ ...prev, date: e.target.value, time: '' }))} className={fieldCls} />
      </div>

      {!lockedTherapistId && therapists.length > 0 && (
        <div>
          <p className={labelCls}>Specific therapist <span className="font-normal text-[#7c725f]">(optional)</span></p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {therapists.map((therapist) => {
              const active = values.therapistId === therapist._id;
              return (
                <button type="button" key={therapist._id} aria-pressed={active} onClick={() => setValues((prev) => ({ ...prev, therapistId: active ? '' : therapist._id, time: '' }))} className={`p-3 sm:p-4 ${cardBase} ${active ? `${cardOn} shadow-sm` : cardOff}`}>
                  <div className="flex items-center gap-3">
                    <MediaImage src={therapist.profileImage} name={therapist.name} alt={therapist.name} wrapperClassName="h-14 w-12 shrink-0" className="h-full w-full object-cover" />
                    <div className="min-w-0"><p className="font-serif text-lg">{therapist.name}</p><p className="mt-1 text-xs text-[#7c725f]">{therapist.specialization || therapist.skills?.join(' · ')}</p></div>
                    <span className="ml-auto"><CheckDot active={active} /></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {values.date && (
        <div>
          <p className={labelCls}>Available times <span className="text-[#8d6a39]">(required)</span></p>
          {loading ? <p role="status" className="mt-3 text-sm text-[#7c725f]">Finding open rooms…</p> : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((slot) => {
                const active = values.time === slot.time;
                return <button type="button" key={slot.time} aria-pressed={active} onClick={() => set('time', slot.time)} className={`min-h-12 border px-2 py-3 text-sm transition ${active ? 'border-[#8d6a39] bg-[#f1e4cf] font-semibold text-[#5d4628] ring-1 ring-[#b08d57]/30' : 'border-[#ded7cc] bg-white hover:border-[#b08d57]'}`}>{slot.time}</button>;
              })}
              {!slots.length && <p className="col-span-full text-sm text-[#7c725f]">No matching slots for this date. Try another day.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CustomerStep({ values, user, spaAddress, set }) {
  if (!user) return <section><h2 className="font-serif text-2xl sm:text-3xl">Sign in to continue.</h2></section>;
  return (
    <section className="space-y-6 sm:space-y-7">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl">Tell us who we are welcoming.</h2>
        <p className="mt-2 text-xs text-[#7c725f]">Fields marked * are required.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-7">
        <Field label="Full name" required value={values.customerName} autoComplete="name" onChange={(e) => set('customerName', e.target.value)} />
        <Field label="Email" type="email" value={values.customerEmail} readOnly autoComplete="email" hint="From your account" />
        <Field label="Phone" required type="tel" inputMode="tel" autoComplete="tel" value={values.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
        {values.bookingType === 'spa'
          ? <div className="sm:col-span-2"><Field label="Spa location" optional value={values.spaAddress || spaAddress} onChange={(e) => set('spaAddress', e.target.value)} placeholder={spaAddress || 'Aviana Wellness, Jaipur'} /></div>
          : <div className="sm:col-span-2"><Field label="Home address" required autoComplete="street-address" value={values.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} placeholder="Full address with landmark" /></div>}
        <div className="sm:col-span-2"><Field label="Notes" optional multiline value={values.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Preferences or anything your therapist should know" /></div>
      </div>
    </section>
  );
}

function Confirmed({ booking }) {
  const extras = booking?.extraServices || [];
  const status = String(booking?.paymentStatus || '').toUpperCase();
  const bookingAmountPaid = booking?.paymentType === 'BOOKING' && Number(booking?.remainingAmount || 0) > 0;
  return <div className="border border-[#dfd5c6] bg-white p-5 text-center sm:p-8"><p className="text-[10px] uppercase tracking-[0.2em] text-[#b08d57]">Reservation confirmed</p><h2 className="mt-4 font-serif text-3xl sm:text-4xl">Your ritual is reserved.</h2><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#7c725f]">A confirmation has been sent to {booking?.customerEmail}. We look forward to welcoming you.</p>{bookingAmountPaid ? <div className="mx-auto mt-6 max-w-xl border border-[#e4dacb] bg-[#f8f3eb] p-5 text-left text-sm text-[#6f5a3b]"><strong>Booking amount paid.</strong> Remaining {money(booking.remainingAmount)} is payable after your service.</div> : status === 'PAID' ? <div className="mx-auto mt-6 max-w-xl border border-[#e4dacb] bg-[#f8f3eb] p-5 text-left text-sm text-[#6f5a3b]">Full payment completed.</div> : null}<div className="mx-auto mt-7 max-w-xl border border-[#ede8df] p-4 text-left text-sm sm:p-6"><p className="text-[10px] uppercase tracking-[0.16em] text-[#b08d57]">Booking {String(booking?._id || '').slice(-8).toUpperCase()}</p><p className="mt-3 font-serif text-2xl">{booking?.service?.title}</p><p className="mt-2 text-[#7c725f]">{prettyDate(booking?.date)} · {booking?.time} · {booking?.therapist?.name}</p><p className="mt-1 text-[#7c725f]">{booking?.bookingType === 'home' ? booking?.homeAddress : booking?.spaAddress}</p><div className="mt-5 space-y-2 border-t border-[#eee8df] pt-5"><PriceLine label="Subtotal" value={money(booking?.subtotal)} /><PriceLine label="Discount" value={booking?.discountAmount ? `− ${money(booking.discountAmount)}` : money(0)} />{extras.map((extra) => <PriceLine key={`${extra.serviceId}-${extra.name}`} label={extra.name} value={money(extra.price)} />)}<PriceLine label="Total" value={money(booking?.totalAmount ?? booking?.price)} strong /><PriceLine label="Paid" value={money(booking?.paidAmount)} /><PriceLine label="Remaining" value={money(booking?.remainingAmount)} /><PriceLine label="Payment" value={`${booking?.paymentType} · ${booking?.paymentStatus}`} /></div></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to={`/dashboard/bookings/${booking?._id}`} className="inline-flex min-h-12 items-center justify-center bg-[#201e1a] px-6 text-[11px] font-semibold tracking-[0.18em] text-white">VIEW BOOKING</Link><Link to="/" className="inline-flex min-h-12 items-center justify-center border border-[#cfc6b8] px-6 text-[11px] font-semibold tracking-[0.18em]">RETURN HOME</Link></div></div>;
}
function PriceLine({ label, value, strong = false }) { return <div className="flex items-center justify-between gap-4"><span className="text-[#7c725f]">{label}</span><span className={strong ? 'font-serif text-lg' : 'font-medium'}>{value}</span></div>; }
function Choice({ active, onClick, title, text }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`p-4 sm:p-6 duration-300 ${cardBase} ${active ? `${cardOn} shadow-sm` : `${cardOff} hover:shadow-sm`}`}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="font-serif text-lg sm:text-xl">{title}</p><p className="mt-1 text-sm leading-6 text-[#7c725f] sm:mt-2">{text}</p></div>
        <CheckDot active={active} />
      </div>
    </button>
  );
}

function Field({ label, required = false, optional = false, hint, multiline = false, ...props }) {
  const cls = 'min-h-12 w-full border-b border-[#d7d0c5] bg-transparent py-3 text-sm outline-none transition focus:border-[#b08d57] read-only:text-[#7c725f]';
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[#6d655a]">
        {label}
        {required && <span className="text-[#8d6a39]" aria-hidden="true"> *</span>}
        {optional && <span className="font-normal text-[#7c725f]"> (optional)</span>}
      </span>
      {multiline
        ? <textarea rows={3} {...props} className={`${cls} resize-y`} />
        : <input aria-required={required || undefined} {...props} className={cls} />}
      {hint && <span className="block text-xs text-[#7c725f]">{hint}</span>}
    </label>
  );
}
