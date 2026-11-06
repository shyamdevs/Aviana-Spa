import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import RecoveryCodes from '../Admin/RecoveryCodes';

const btn = 'inline-flex min-h-11 items-center border border-[#d8d0c3] px-5 text-[10px] tracking-[0.18em]';
const field = 'mt-2 w-full max-w-xs border-b border-[#d7d0c5] bg-transparent py-3 text-sm outline-none focus:border-[#b08d57]';

export default function SecurityPanel() {
  const { user, refresh } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const [form, setForm] = useState({ code: '', password: '' });
  const [msg, setMsg] = useState('');
  const load = useCallback(() => api.get('/auth/sessions').then((r) => setSessions(r.sessions)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const act = async (fn) => { setMsg(''); try { await fn(); } catch (err) { setMsg(err.message); } };

  const start = () => act(async () => setSetup(await api.post('/auth/mfa/setup', {})));
  const enable = () => act(async () => { const r = await api.post('/auth/mfa/enable', { enrollToken: setup.enrollToken, code: form.code }); setSetup(null); setCodes(r.recoveryCodes); setForm({ code: '', password: '' }); await refresh(); await load(); });
  const disable = () => act(async () => { await api.post('/auth/mfa/disable', form); setForm({ code: '', password: '' }); await refresh(); await load(); });
  const revoke = (id) => act(async () => { await api.delete(`/auth/sessions/${id}`); await load(); });
  const logoutAll = () => act(async () => { await api.post('/auth/logout-all', {}); window.location.assign('/login'); });

  return (
    <section className="space-y-8 border border-black/5 bg-white p-5 sm:p-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Two-step verification</p>
        <p className="mt-2 text-sm leading-7 text-[#7c725f]">{user?.mfaEnabled ? 'Enabled. You will be asked for an authenticator code when you sign in.' : 'Optional extra protection using an authenticator app.'}</p>
        {codes && <div className="mt-4 max-w-md"><RecoveryCodes codes={codes} dark={false} onDone={() => setCodes(null)} /></div>}
        {!user?.mfaEnabled && !setup && !codes && <button type="button" onClick={start} className={`${btn} mt-4`}>SET UP</button>}
        {setup && (
          <div className="mt-4 space-y-3 text-sm">
            <p>Add this setup key in your authenticator app (time-based):</p>
            <p className="break-all bg-[#faf6ea] p-3 font-mono">{setup.secret}</p>
            <input aria-label="6-digit code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="6-digit code" value={form.code} onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))} className={field} />
            <div><button type="button" onClick={enable} className={btn}>TURN ON</button></div>
          </div>
        )}
        {user?.mfaEnabled && (
          <div className="mt-4 space-y-2">
            <input aria-label="Password" type="password" autoComplete="current-password" placeholder="Password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} className={field} />
            <input aria-label="Authenticator code" autoComplete="one-time-code" placeholder="Authenticator or recovery code" value={form.code} onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))} className={field} />
            <div><button type="button" onClick={disable} className={btn}>TURN OFF</button></div>
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Signed-in devices</p>
        <ul className="mt-3 divide-y divide-black/5 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="max-w-md truncate">{s.device}{s.current ? ' (this device)' : ''}<span className="block text-xs text-[#9b9184]">Active {new Date(s.lastActivityAt).toLocaleString()}</span></span>
              {!s.current && <button type="button" onClick={() => revoke(s.id)} className="min-h-11 text-xs text-red-700">Sign out</button>}
            </li>
          ))}
        </ul>
        <button type="button" onClick={logoutAll} className={`${btn} mt-4`}>SIGN OUT EVERYWHERE</button>
      </div>
      {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
    </section>
  );
}
