// Thin gold rule with a small diamond at its centre.
export default function Ornament({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px w-12 bg-[#B08D57]/60 sm:w-20" />
      <span className="h-1.5 w-1.5 rotate-45 border border-[#B08D57]" />
      <span className="h-px w-12 bg-[#B08D57]/60 sm:w-20" />
    </div>
  );
}
