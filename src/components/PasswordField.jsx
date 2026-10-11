import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ label, value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);
  const inputId = props.id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  return <label className="block space-y-2"><span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7c725f]">{label}</span><div className="relative"><input id={inputId} {...props} type={visible ? 'text' : 'password'} value={value} onChange={onChange} className="w-full border-b border-[#d7d0c5] bg-transparent py-3 pr-11 text-sm outline-none transition focus:border-[#b08d57]"/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#8f8678] hover:text-[#201e1a]">{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>;
}
