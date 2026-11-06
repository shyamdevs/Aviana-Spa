import { useId } from 'react';

// One accessible numeric field. autoComplete="one-time-code" lets phones offer the code from the email/SMS.
export default function OtpInput({ value, onChange, disabled, label = 'Verification code', invalid }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d655a]">{label}</label>
      <input
        id={id} value={value} disabled={disabled} inputMode="numeric" pattern="[0-9]*" maxLength={6}
        autoComplete="one-time-code" aria-invalid={invalid || undefined} placeholder="••••••"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className={`min-h-14 w-full border-b bg-transparent text-center font-mono text-3xl tracking-[0.5em] outline-none transition focus:border-[#b08d57] sm:text-4xl ${invalid ? 'border-red-400' : 'border-[#d7d0c5]'}`}
      />
    </div>
  );
}
