import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, useAdmin } from '../../store/AdminContext';
import RecoveryCodes from './RecoveryCodes';

const input = 'mt-2 w-full border-b border-white/15 bg-transparent py-3 outline-none focus:border-[#b08d57]';
const label = 'text-[10px] uppercase tracking-[0.18em] text-white/40';

// Steps: password -> (enrol authenticator | enter code) -> dashboard. Admin MFA is mandatory.
export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [step, setStep] = useState({ name: 'password' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const { setAdmin } = useAdmin();
  const navigate = useNavigate();

  const run = async (fn) => { setError(''); setBusy(true); try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); } };

  const password = () => run(async () => {
    const r = await adminApi.post('/auth/login', form);
    if (r.mfaRequired) setStep({ name: 'code', mfaToken: r.mfaToken });
    else if (r.mfaEnrollRequired) setStep({ name: 'enroll', enrollToken: r.enrollToken, secret: r.secret, uri: r.otpauthUri });
  });
  const verify = () => run(async () => { const r = await adminApi.post('/auth/mfa', { mfaToken: step.mfaToken, code }); setAdmin(r.admin); navigate('/admin'); });
  const enroll = () => run(async () => { const r = await adminApi.post('/auth/mfa/enroll', { enrollToken: step.enrollToken, code }); setAdmin(r.admin); setRecovery(r.recoveryCodes); });

  if (recovery) return <Shell title="Save your recovery codes"><RecoveryCodes codes={recovery} onDone={() => navigate('/admin')} /></Shell>;
  const submit = (e) => { e.preventDefault(); if (step.name === 'password') password(); else if (step.name === 'code') verify(); else enroll(); };
  return (
    <Shell title="Aviana Admin">
      <form onSubmit={submit} className="space-y-6">
        {step.name === 'password' && (<>
          <label className="block"><span className={label}>Email</span><input type="email" required autoComplete="username" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} className={input} /></label>
          <label className="block"><span className={label}>Password</span><input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} className={input} /></label>
        </>)}
        {step.name === 'enroll' && (
          <div className="space-y-4 text-sm leading-6 text-white/70">
            <p>Two-step verification is required for administrators. In your authenticator app choose “Enter a setup key” and add:</p>
            <p className="break-all border border-white/10 bg-black/30 p-3 font-mono text-[#e8d8b4]">{step.secret}</p>
            <p className="text-xs text-white/40">Account: {form.email} · Type: time-based. Then enter the 6-digit code it shows.</p>
          </div>
        )}
        {step.name !== 'password' && <label className="block"><span className={label}>{step.name === 'code' ? 'Authenticator or recovery code' : '6-digit code'}</span><input required autoComplete="one-time-code" maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} className={input} /></label>}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full bg-[#b08d57] py-4 text-[11px] tracking-[0.2em] text-[#151411] disabled:opacity-60">{busy ? 'PLEASE WAIT…' : step.name === 'password' ? 'CONTINUE' : 'VERIFY'}</button>
      </form>
    </Shell>
  );
}

function Shell({ title, children }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#151411] px-6 text-white">
      <div className="w-full max-w-md border border-white/10 bg-[#1d1b17] p-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#b08d57]">Private administration</p>
        <h1 className="mt-3 font-serif text-4xl">{title}</h1>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
