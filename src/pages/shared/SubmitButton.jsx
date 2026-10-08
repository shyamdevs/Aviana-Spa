export default function SubmitButton({ children, disabled = false, loading = false, className = '' }) {
  return <button type="submit" disabled={disabled || loading} className={`inline-flex min-h-12 items-center justify-center border border-[#B08D57] bg-[#B08D57] px-10 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em] text-white transition-colors duration-500 hover:bg-transparent hover:text-[#8f7042] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}
