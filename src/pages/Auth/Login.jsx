import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import Field from '../../components/Field';
import PasswordField from '../../components/PasswordField';
import SubmitButton from '../shared/SubmitButton';
import GoogleSignIn from '../../components/GoogleSignIn';
import { useAuth } from '../../hooks/useAuth';
import { safeReturnTo } from '../../utils/safeRedirect';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [mfa, setMfa] = useState(null); // { mfaToken } while the second factor is pending
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, google, loginMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeReturnTo(new URLSearchParams(location.search).get('returnTo'));
  const notice = location.state?.notice;

  const run = async (fn) => {
    setError(''); setLoading(true);
    try { const r = await fn(); if (r?.mfaRequired) setMfa({ mfaToken: r.mfaToken }); else navigate(returnTo, { replace: true }); }
    catch (err) { setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes.' : err.message); if (mfa) setCode(''); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{mfa ? 'Two-step check.' : 'Welcome back.'}</h2>
      <p className="mt-3 text-sm leading-7 text-[#7c725f]">{mfa ? 'Enter the 6-digit code from your authenticator app, or one of your recovery codes.' : 'Enter your details to manage your Aviana experience.'}</p>
      {notice && !mfa && <p role="status" className="mt-6 border border-[#d9cfae] bg-[#faf6ea] px-4 py-3 text-sm text-[#5a4a22]">{notice}</p>}
      {mfa ? (
        <form onSubmit={(e) => { e.preventDefault(); run(() => loginMfa({ mfaToken: mfa.mfaToken, code })); }} className="mt-10 space-y-7">
          <Field label="Authenticator or recovery code" name="code" inputMode="text" autoComplete="one-time-code" required maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} />
          {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <SubmitButton loading={loading}>{loading ? 'VERIFYING…' : 'VERIFY'}</SubmitButton>
          <button type="button" onClick={() => { setMfa(null); setCode(''); setError(''); }} className="min-h-11 text-xs text-[#7c725f] hover:text-[#b08d57]">Back</button>
        </form>
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); run(() => login(form)); }} className="mt-10 space-y-7">
            <Field label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
            <PasswordField label="Password" name="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} />
            {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <SubmitButton loading={loading}>{loading ? 'SIGNING IN…' : 'SIGN IN'}</SubmitButton>
          </form>
          <GoogleSignIn onSuccess={(credential) => run(() => google(credential))} onError={setError} />
          <div className="mt-7 flex flex-wrap justify-between gap-3 text-xs text-[#7c725f]">
            <Link to="/forgot-password" className="inline-flex min-h-11 items-center hover:text-[#b08d57]">Forgot password?</Link>
            <Link to={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-11 items-center hover:text-[#b08d57]">Create an account</Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
