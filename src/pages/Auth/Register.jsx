import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import OtpPanel from './OtpPanel';
import Field from '../../components/Field';
import PasswordField from '../../components/PasswordField';
import SubmitButton from '../shared/SubmitButton';
import GoogleSignIn from '../../components/GoogleSignIn';
import { api } from '../../services/api';
import { safeReturnTo } from '../../utils/safeRedirect';

// Guidance only - the server enforces the real policy (12+ chars, not common, no name/e-mail).
function strength(p) { let s = 0; if (p.length >= 12) s++; if (p.length >= 16) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return s; }
const EMPTY = { fullName: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function Register() {
  const [form, setForm] = useState(EMPTY);
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeReturnTo(new URLSearchParams(location.search).get('returnTo'));
  const level = useMemo(() => strength(form.password), [form.password]);
  const change = (e) => setForm((v) => ({ ...v, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try { setChallenge(await api.post('/auth/register', form)); }
    catch (err) { setError(err.status === 429 ? 'Too many requests. Please try again later.' : err.message); }
    finally { setLoading(false); }
  };

  const done = () => navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true, state: { notice: 'Your email is verified and your account is ready. Please sign in.' } });

  return (
    <AuthLayout eyebrow={challenge ? 'Verify your email' : 'Private Client Access'}>
      <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{challenge ? 'Check your inbox.' : 'Begin your account.'}</h2>
      {challenge ? (
        <OtpPanel email={form.email} challenge={challenge} verifyPath="/auth/register/verify" resendPath="/auth/register/resend" onVerified={done} onRestart={() => setChallenge(null)} />
      ) : (
        <>
          <p className="mt-3 text-sm leading-7 text-[#7c725f]">One account keeps your reservations, receipts and history together. We will email you a code to verify your address.</p>
          <form onSubmit={submit} className="mt-10 space-y-7">
            <Field label="Full name" name="fullName" autoComplete="name" required minLength={2} maxLength={100} value={form.fullName} onChange={change} />
            <Field label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={change} />
            <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={change} />
            <PasswordField label="Password" name="password" autoComplete="new-password" required minLength={12} maxLength={72} value={form.password} onChange={change} />
            {form.password && (
              <div className="flex items-center gap-2">
                <div className="grid flex-1 grid-cols-5 gap-1">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={`h-1 rounded-full ${i < level ? 'bg-[#b08d57]' : 'bg-[#e2dbd1]'}`} />)}</div>
                <span className="text-[10px] uppercase tracking-[0.13em] text-[#8f8678]">{level < 3 ? 'Too easy' : 'Strong'}</span>
              </div>
            )}
            <p className="text-xs leading-5 text-[#8f8678]">At least 12 characters. A short phrase of several words works well.</p>
            <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" required minLength={12} maxLength={72} value={form.confirmPassword} onChange={change} />
            {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <label className="flex items-start gap-3 text-xs leading-5 text-[#7c725f]"><input type="checkbox" required className="mt-1" />I agree to use Aviana services under the applicable booking and cancellation terms.</label>
            <SubmitButton loading={loading}>{loading ? 'SENDING CODE…' : 'SEND VERIFICATION CODE'}</SubmitButton>
          </form>
          <GoogleSignIn onSuccess={async (credential) => { try { await api.post('/auth/google', { idToken: credential }); window.location.assign(returnTo); } catch (err) { setError(err.message); } }} onError={setError} />
        </>
      )}
      <div className="mt-7 text-xs text-[#7c725f]">Already registered? <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="text-[#b08d57]">Sign in</Link></div>
    </AuthLayout>
  );
}
