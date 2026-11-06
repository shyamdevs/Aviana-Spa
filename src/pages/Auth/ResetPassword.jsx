import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import PasswordField from '../../components/PasswordField';
import SubmitButton from '../shared/SubmitButton';
import { api } from '../../services/api';
import { clearResetToken, takeResetToken } from '../../utils/resetSession';

// Dedicated change-password page: it can set a new password and nothing else.
export default function ResetPassword() {
  const [token] = useState(() => takeResetToken());
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // No verified OTP in memory (direct visit, refresh, old e-mailed link): start the recovery flow.
  if (!token) return <Navigate to="/forgot-password" replace />;

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/password/reset', { resetToken: token, ...form });
      clearResetToken();
      navigate('/login', { replace: true, state: { notice: 'Password updated. Please sign in with your new password.' } });
    } catch (err) {
      setError(err.message);
      if (err.status === 400 && /session|expired/i.test(err.message)) clearResetToken();
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout eyebrow="Secure Reset">
      <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Choose a new password.</h2>
      <p className="mt-3 text-sm leading-7 text-[#7c725f]">You will be signed out of every device. Use at least 12 characters.</p>
      <form onSubmit={submit} className="mt-10 space-y-7">
        <PasswordField label="New password" name="newPassword" autoComplete="new-password" minLength={12} maxLength={72} required value={form.newPassword} onChange={(e) => setForm((v) => ({ ...v, newPassword: e.target.value }))} />
        <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={72} required value={form.confirmPassword} onChange={(e) => setForm((v) => ({ ...v, confirmPassword: e.target.value }))} />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <SubmitButton loading={loading}>{loading ? 'UPDATING…' : 'UPDATE PASSWORD'}</SubmitButton>
      </form>
      <Link to="/login" className="mt-7 inline-block text-xs text-[#7c725f]">Cancel</Link>
    </AuthLayout>
  );
}
