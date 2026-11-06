import { api } from './api';

let razorpayLoader = null;

export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayLoader) return razorpayLoader;

  razorpayLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      script.remove();
      razorpayLoader = null;
      reject(new Error('Razorpay checkout timed out while loading. Please check your internet connection and try again.'));
    }, 15000);

    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.Razorpay) resolve();
      else {
        razorpayLoader = null;
        reject(new Error('Razorpay checkout loaded incorrectly. Please refresh and try again.'));
      }
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      razorpayLoader = null;
      reject(new Error('Razorpay checkout could not load. Please check your internet connection and try again.'));
    };
    document.head.appendChild(script);
  });

  return razorpayLoader;
};

export async function openRazorpay({ order, keyId, description, prefill, onSuccess, onFailure, onDismiss }) {
  await loadRazorpay();
  if (!order?.id || !Number(order.amount) || !order.currency) throw new Error('Razorpay order details are incomplete. Please retry payment.');
  if (!keyId) throw new Error('Razorpay public key is missing. Please configure the payment gateway.');

  const checkout = new window.Razorpay({
    key: keyId,
    amount: Number(order.amount),
    currency: order.currency,
    name: 'Aviana',
    description: description || 'Aviana appointment',
    order_id: order.id,
    prefill: prefill || {},
    theme: { color: '#b08d57' },
    modal: { ondismiss: onDismiss },
    handler: onSuccess,
  });
  checkout.on('payment.failed', onFailure);
  checkout.open();
  return checkout;
}

export async function createInitialOrder(bookingId) {
  return api.post('/payments/create-order', { bookingId });
}

export async function createRemainingOrder(bookingId) {
  return api.post('/payments/remaining/create-order', { bookingId });
}

export async function verifyRazorpayPayment(response) {
  return api.post('/payments/verify', response);
}

export async function verifyRazorpayPaymentWithRecovery(response, bookingId) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await verifyRazorpayPayment(response);
    } catch (error) {
      lastError = error;
      if (![409, 500, 503].includes(error.status)) break;
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }
  }

  if (bookingId) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const statusResponse = await api.get(`/bookings/${bookingId}`).catch(() => null);
      const paymentStatus = String(statusResponse?.booking?.paymentStatus || '').toUpperCase();
      if (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL') return statusResponse;
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    }
  }

  throw lastError || new Error('Payment status could not be confirmed yet. Please check your booking before retrying.');
}
