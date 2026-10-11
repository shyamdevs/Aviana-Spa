import { money } from '../../utils/format';

function Line({ label, value, muted = false }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className={muted ? 'text-[#9b9184]' : 'text-[#7c725f]'}>{label}</span><span className="font-medium text-[#201e1a]">{value}</span></div>;
}

export default function PaymentOptionStep({ values, selected, therapist, extras, pricing, homeFee, paymentOptions, paymentType, setPaymentType }) {
  const bookingOption = paymentOptions?.bookingOption;
  const discountText = paymentOptions?.fullPaymentDiscountEnabled ? `Save ${Number(paymentOptions.fullPaymentDiscountPercent || 0)}%` : 'Pay once, no remaining balance';
  const baseLabel = values.bookingType === 'home' && homeFee > 0 ? 'Service + home visit' : 'Service';
  return (
    <section className="space-y-7">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Payment</p>
        <h2 className="mt-2 font-serif text-3xl">Choose how you would like to pay.</h2>
        <p className="mt-2 text-sm leading-6 text-[#7c725f]">Your final charge is calculated again on the server using the current Aviana prices and active discount rules.</p>
      </div>

      <div className="border border-[#dfd8ce] bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.17em] text-[#b08d57]">Booking summary</p>
            <h3 className="mt-2 font-serif text-2xl">{selected?.title}</h3>
            <p className="mt-1 text-sm text-[#7c725f]">{therapist?.name || 'Any suitable therapist'} · {values.date} · {values.time}</p>
            <p className="mt-1 text-sm text-[#7c725f]">{values.bookingType === 'home' ? 'Home massage' : 'Spa visit'}</p>
          </div>
          <p className="font-serif text-2xl">{money(pricing?.totalAmount ?? 0)}</p>
        </div>

        <div className="mt-7 space-y-3 border-t border-[#eee8df] pt-5">
          <Line label={baseLabel} value={money(pricing?.baseServiceAmount ?? 0)} />
          {extras.map((extra) => <Line key={extra._id} label={extra.name} value={money(extra.price)} />)}
          <Line label="Subtotal" value={money(pricing?.subtotal ?? 0)} />
          <Line label="Discount" value={pricing?.discountAmount ? `− ${money(pricing.discountAmount)}` : money(0)} muted />
        </div>
      </div>

      <div className="grid gap-4">
        <PaymentChoice active={paymentType === 'FULL'} onClick={() => setPaymentType('FULL')} title="Pay Full Amount" text={discountText} amount={pricing?.totalAmount ?? 0} badge={pricing?.discountAmount ? `You save ${money(pricing.discountAmount)}` : ''} />
        {bookingOption && <PaymentChoice active={paymentType === 'BOOKING'} onClick={() => setPaymentType('BOOKING')} title={bookingOption.name || 'Booking'} text={bookingOption.description || 'Pay the fixed booking amount to reserve your appointment. The balance is payable after your service.'} amount={bookingOption.price} badge={Number(pricing?.remainingAmount || 0) > 0 ? `Remaining after service ${money(pricing.remainingAmount)}` : 'This amount covers the full appointment'} />}
        {!bookingOption && <div className="border border-[#e4dacb] bg-[#f8f3eb] p-5 text-sm text-[#6f5a3b]">The fixed Booking amount is currently unavailable. Please choose full payment or contact Aviana support.</div>}
      </div>

      {paymentType === 'FULL' ? (
        <div className="border border-[#e4dacb] bg-[#f8f3eb] p-5 text-sm text-[#6f5a3b]">{pricing?.discountAmount ? `Full payment saves you ${money(pricing.discountAmount)} today.` : 'Full payment completes the booking balance today.'}</div>
      ) : (
        <div className="border border-[#e4dacb] bg-[#f8f3eb] p-5 text-sm text-[#6f5a3b]"><strong>Pay booking amount {money(pricing?.initialAmount ?? bookingOption?.price ?? 0)}</strong> · Remaining after service {money(pricing?.remainingAmount ?? 0)}.</div>
      )}
    </section>
  );
}

function PaymentChoice({ active, onClick, title, text, amount, badge }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`border p-6 text-left transition ${active ? 'border-[#8d6a39] bg-[#f1e4cf] shadow-sm ring-1 ring-[#b08d57]/25' : 'border-[#e3ddd4] bg-white hover:border-[#b08d57]/55'}`}>
      <div className="flex items-start justify-between gap-5">
        <div className="flex gap-4">
          <span className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${active ? 'border-[#201e1a] bg-[#201e1a] text-white' : 'border-[#d8d0c3] text-transparent'}`}>✓</span>
          <div>
            <p className="font-serif text-xl text-[#201e1a]">{title}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7c725f]">{text}</p>
            {badge && <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[#8f7042]">{badge}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-serif text-xl">{money(amount)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9b9184]">Pay now</p>
        </div>
      </div>
    </button>
  );
}
