// Small uppercase label with wide tracking.
export default function Label({ children, light = false, className = "" }) {
  return (
    <p
      className={`text-[10px] font-medium uppercase tracking-[0.4em] sm:text-[11px] ${
        light ? "text-[#D9C4A4]" : "text-[#B08D57]"
      } ${className}`}
    >
      {children}
    </p>
  );
}
