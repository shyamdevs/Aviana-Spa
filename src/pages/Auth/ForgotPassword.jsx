import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import OtpPanel from './OtpPanel';
import Field from '../../components/Field';
import SubmitButton from '../shared/SubmitButton';
import { api } from '../../services/api';
import { setResetToken } from '../../utils/resetSession';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { setChallenge(await api.post('/auth/password/forgot', { email })); }
    catch (err) { setError(err.status === 429 ? 'Too many requests. Please try again later.' : err.message); }
    finally { setLoading(false); }
  };

  // The server answers a correct OTP with a separate single-use token; it is held in memory only.
  const verified = ({ resetToken, expiresInSeconds }) => { setResetToken(resetToken, expiresInSeconds); navigate('/reset-password', { replace: true }); };

  return (
    <AuthLayout eyebrow="Account Recovery">
      <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{challenge ? 'Enter your code.' : 'Forgot your password?'}</h2>
      {challenge ? (
        <OtpPanel email={email} challenge={challenge} verifyPath="/auth/password/verify-otp" resendPath="/auth/password/resend" onVerified={verified} onRestart={() => setChallenge(null)} />
      ) : (
        <>
          <p className="mt-3 text-sm leading-7 text-[#7c725f]">Enter your registered email. If an account exists, we will send a 6-digit code to it.</p>
          <form onSubmit={submit} className="mt-10 space-y-7">
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <SubmitButton loading={loading}>{loading ? 'SENDING…' : 'SEND CODE'}</SubmitButton>
          </form>
        </>
      )}
      <Link to="/login" className="mt-7 inline-block text-xs text-[#7c725f] hover:text-[#b08d57]">Back to sign in</Link>
    </AuthLayout>
  );
}
