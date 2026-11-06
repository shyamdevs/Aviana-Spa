// Underlined, minimal form field that matches the thin-border spa aesthetic.
const base =
  "w-full border-0 border-b border-[#B08D57]/40 bg-transparent min-h-12 py-3 text-sm font-light text-[#171512] placeholder-[#a8a29a] transition-colors duration-300 focus:border-[#B08D57] focus:outline-none";

export default function FormField({ label, id, as = "input", children, ...props }) {
  const Tag = as;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-medium uppercase tracking-[0.22em] text-[#7a6240]"
      >
        {label}
      </label>
      <Tag id={id} name={id} className={base} {...props}>
        {children}
      </Tag>
    </div>
  );
}
