import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';

export const razorpay = env.razorpayKeyId && env.razorpayKeySecret
  ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
  : null;

export function verifyPaymentSignature(orderId, paymentId, signature) {
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
  if (!signature || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
