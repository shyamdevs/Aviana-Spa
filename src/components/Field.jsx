import { useId } from 'react';

export default function Field({ label, error, id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="block space-y-2">
      <label htmlFor={inputId} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d655a]">{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className={`min-h-12 w-full border-b bg-transparent px-0 py-3 text-sm text-[#201e1a] outline-none transition focus:border-[#b08d57] ${error ? 'border-red-400' : 'border-[#d7d0c5]'}`}
      />
      {error && <span id={errorId} role="alert" className="block text-xs text-red-600">{error}</span>}
    </div>
  );
}
