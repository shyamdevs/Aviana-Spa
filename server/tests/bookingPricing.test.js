import assert from 'node:assert/strict';
import { calculateBookingAmounts } from '../utils/bookingPricing.js';

const discountSettings = { fullPaymentDiscountEnabled: true, fullPaymentDiscountPercent: 10, fullPaymentDiscountMaxAmount: null };
const bookingOption = { _id: 'booking-option-test', name: 'Booking Amount', description: 'Reserve with a fixed booking amount.', price: 500 };

const t1 = calculateBookingAmounts({ baseServiceAmount: 2000, extraServices: [], paymentType: 'FULL', settings: discountSettings });
assert.equal(t1.totalAmount, 1800);
assert.equal(t1.initialAmount, 1800);
assert.equal(t1.remainingAmount, 0);

const t2 = calculateBookingAmounts({ baseServiceAmount: 2000, extraServices: [{ price: 500 }], paymentType: 'FULL', settings: discountSettings });
assert.equal(t2.totalAmount, 2250);
assert.equal(t2.discountAmount, 250);

const t3 = calculateBookingAmounts({ baseServiceAmount: 2000, extraServices: [{ price: 500 }], paymentType: 'BOOKING', settings: discountSettings, bookingOption: { ...bookingOption, price: 1250 } });
assert.equal(t3.subtotal, 2500);
assert.equal(t3.totalAmount, 2500);
assert.equal(t3.initialAmount, 1250);
assert.equal(t3.remainingAmount, 1250);
assert.equal(t3.discountAmount, 0);

const t4 = calculateBookingAmounts({ baseServiceAmount: 3000, extraServices: [{ price: 500 }, { price: 700 }], paymentType: 'BOOKING', settings: discountSettings, bookingOption: bookingOption });
assert.equal(t4.subtotal, 4200);
assert.equal(t4.initialAmount, 500);
assert.equal(t4.remainingAmount, 3700);

assert.throws(() => calculateBookingAmounts({ baseServiceAmount: 300, extraServices: [], paymentType: 'BOOKING', settings: discountSettings, bookingOption }), /higher than this appointment total/);

console.log('Booking pricing FULL/BOOKING scenarios passed.');
