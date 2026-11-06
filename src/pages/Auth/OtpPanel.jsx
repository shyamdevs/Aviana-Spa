import { useState } from 'react';
import OtpInput from '../../components/OtpInput';
import SubmitButton from '../shared/SubmitButton';
import { useCountdown, mmss } from '../../hooks/useCountdown';
import { api } from '../../services/api';

// Shared six-digit verification step (signup + password recovery).
// The challenge id comes from the server; ownership is proven by an HttpOnly cookie the browser holds.
export default function OtpPanel({ email, challenge, verifyPath, resendPath, onVerified, onRestart }) {
  const [otp, setOtp] = useState('');
  const [state, setState] = useState({ loading: false, resending: false, error: '', info: '' });
  const [expiresIn, restartExpiry] = useCountdown(challenge.expiresInSeconds);
  const [resendIn, restartResend] = useCountdown(challenge.resendAfterSeconds);
  const [id, setId] = useState(challenge.challengeId);
  const expired = expiresIn <= 0;

  const verify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6 || expired) return;
    setState((s) => ({ ...s, loading: true, error: '', info: '' }));
    try {
      const data = await api.post(verifyPath, { challengeId: id, otp });
      onVerified(data);
    } catch (err) {
      const left = err.data?.attemptsLeft;
      const message = err.data?.expired ? 'This code has expired or is locked. Request a new one.' : `${err.message}${left !== undefined ? ` ${left} attempt${left === 1 ? '' : 's'} left.` : ''}`;
      setState((s) => ({ ...s, loading: false, error: err.status === 429 ? 'Too many attempts. Please wait a few minutes.' : message }));
      setOtp('');
    }
  };

  const resend = async () => {
    setState((s) => ({ ...s, resending: true, error: '', info: '' }));
    try {
      const data = await api.post(resendPath, { challengeId: id });
      setId(data.challengeId); restartExpiry(data.expiresInSeconds); restartResend(data.resendAfterSeconds);
      setState((s) => ({ ...s, resending: false, info: 'A new code is on its way.' })); setOtp('');
    } catch (err) {
      if (err.data?.retryAfterSeconds) restartResend(Math.min(err.data.retryAfterSeconds, 3600));
      setState((s) => ({ ...s, resending: false, error: err.status === 400 ? 'This session has expired. Please start again.' : err.message }));
    }
  };

  return (
    <form onSubmit={verify} className="mt-10 space-y-7" noValidate>
      <p className="text-sm leading-7 text-[#7c725f]">We sent a 6-digit code to <strong className="text-[#201e1a]">{email}</strong>. Enter it below to continue.</p>
      <OtpInput value={otp} onChange={setOtp} disabled={state.loading || expired} invalid={Boolean(state.error)} />
      <p className={`text-xs ${expired ? 'text-red-600' : 'text-[#7c725f]'}`} role="status" aria-live="polite">
        {expired ? 'This code has expired.' : `Code expires in ${mmss(expiresIn)}`}
      </p>
      {state.error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.info && <p role="status" className="text-sm text-[#7c725f]">{state.info}</p>}
      <SubmitButton loading={state.loading} disabled={otp.length !== 6 || expired}>{state.loading ? 'VERIFYING…' : 'VERIFY'}</SubmitButton>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#7c725f]">
        <button type="button" onClick={resend} disabled={resendIn > 0 || state.resending} className="inline-flex min-h-11 items-center text-[#b08d57] disabled:text-[#a59d8f]">
          {state.resending ? 'Sending…' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        </button>
        <button type="button" onClick={onRestart} className="inline-flex min-h-11 items-center hover:text-[#b08d57]">Use a different email</button>
      </div>
    </form>
  );
}
