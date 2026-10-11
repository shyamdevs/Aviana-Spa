import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ label, value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);
  const inputId = props.id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return <div className="block space-y-2"><label htmlFor={inputId} className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6d655a]">{label}</label><div className="relative"><input id={inputId} {...props} type={visible ? 'text' : 'password'} value={value} onChange={onChange} className="min-h-12 w-full border-b border-[#d7d0c5] bg-transparent py-3 pr-12 text-sm outline-none transition focus:border-[#b08d57]"/><button type="button" onClick={()=>setVisible(v=>!v)} aria-pressed={visible} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-[#6d655a] hover:text-[#201e1a]">{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>;
}
