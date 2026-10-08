export default function Field({ label, error, ...props }) {
  return <label className="block space-y-2"><span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7c725f]">{label}</span><input {...props} className={`w-full border-b border-[#d7d0c5] bg-transparent px-0 py-3 text-sm text-[#201e1a] outline-none transition focus:border-[#b08d57] ${error ? 'border-red-400' : ''}`} />{error && <span className="text-xs text-red-600">{error}</span>}</label>;
}
