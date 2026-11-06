import { env } from '../config/env.js';

// Mobile OTP extension point. No SMS provider is wired in, and none is activated without explicit
// configuration and approval (SMS costs money). Until a provider module is added here,
// smsConfigured() is false and any flow that REQUIRES phone verification refuses to start rather
// than pretending a text was sent. OtpChallenge already carries requiredChannels / verifiedChannels,
// so adding an 'sms' channel means: send via the provider, verify with the same hash/attempt/resend
// rules in otpService, and require both channels in registrationController before User.create.
export const smsConfigured = () => Boolean(env.smsProvider) && false;
export async function sendSms() { throw Object.assign(new Error('SMS provider not configured.'), { status: 503 }); }
