import { useState } from 'react';

// Recovery codes are shown exactly once; the server keeps only keyed hashes.
export default function RecoveryCodes({ codes, onDone, dark = true }) {
  const [saved, setSaved] = useState(false);
  const cls = dark ? 'border-white/10 bg-black/30 text-[#e8d8b4]' : 'border-black/10 bg-[#faf6ea] text-[#201e1a]';
  return (
    <div className="space-y-5">
      <p className={`text-sm leading-6 ${dark ? 'text-white/70' : 'text-[#7c725f]'}`}>Store these one-time codes somewhere safe. Each works once if you lose your authenticator. They will not be shown again.</p>
      <ul className={`grid grid-cols-2 gap-2 border p-4 font-mono text-sm ${cls}`}>{codes.map((c) => <li key={c}>{c}</li>)}</ul>
      <button type="button" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))} className="text-xs underline">Copy codes</button>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I have saved my recovery codes</label>
      <button type="button" disabled={!saved} onClick={onDone} className="w-full bg-[#b08d57] py-4 text-[11px] tracking-[0.2em] text-[#151411] disabled:opacity-40">CONTINUE</button>
    </div>
  );
}
