import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, X } from 'lucide-react';
import { api } from '../services/api';
import './CustomerCareWidget.css';

const welcome = { role: 'assistant', content: 'Hi there! Welcome to Aviana. How can I help you today?' };
export default function CustomerCareWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcome]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  if (location.pathname.startsWith('/admin')) return null;

  async function send(text = draft) {
    if (!text.trim() || loading || handoff || ticket) return;
    const next = [...messages, { role: 'user', content: text.trim() }];
    setMessages(next); setDraft(''); setLoading(true);
    try {
      const result = await api.post('/customer-care/chat', { messages: next.slice(-14) });
      setMessages((old) => [...old, { role: 'assistant', content: result.reply || 'Please try again.' }]);
      if (result.needsHuman) setHandoff(true);
    } catch (e) {
      setMessages((old) => [...old, { role: 'assistant', content: e.status === 429 ? 'The free AI limit is reached for now. Please try later or contact our team.' : 'AI is temporarily unavailable. You can still contact our team below.' }]);
    } finally { setLoading(false); }
  }
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      const result = await api.post('/customer-care/tickets', { customerName: contact.name, email: contact.email, phone: contact.phone, messages: messages.slice(-20) });
      setTicket(result);
    } catch (e) { setError(e.message || 'Could not save the request. Try again.'); }
  }
  return <div className="aviana-care">
    {open && <section className="care-panel" role="dialog" aria-label="Aviana customer care">
      <header className="care-header"><div><strong>Aviana Care <small>AI</small></strong><p>Your personal spa concierge</p></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X size={19}/></button></header>
      <div className="care-log">{messages.map((m, i) => <div key={m.role + i} className={'care-row ' + m.role}><div className="care-bubble">{m.content}</div><small>{m.role === 'user' ? 'You' : 'Aviana Care'}</small></div>)}{loading && <p>Aviana Care is typing…</p>}{ticket && <p className="care-success">Request saved: {ticket.ticket?.reference}. {ticket.emailSent ? 'Support inbox notified.' : 'Email notification is not configured or failed.'}</p>}</div>
      {handoff && !ticket && <form className="care-form" onSubmit={submit}><strong>Let’s get you to our team</strong><label>Your name<input required value={contact.name} onChange={e => setContact({...contact,name:e.target.value})}/></label><label>Email<input type="email" value={contact.email} onChange={e => setContact({...contact,email:e.target.value})}/></label><label>Phone<input value={contact.phone} onChange={e => setContact({...contact,phone:e.target.value})}/></label><small>Provide an email or phone. Your chat will be shared with support. Don’t share passwords, OTPs or payment PINs.</small>{error && <p>{error}</p>}<button disabled={!contact.name.trim() || (!contact.email.trim() && !contact.phone.trim())}>Send to customer care</button></form>}
      {!handoff && !ticket && messages.length === 1 && <div className="care-prompts"><button onClick={() => send('Show me the available services and prices.')}>Services & prices</button><button onClick={() => send('How does home massage work and what does it cost?')}>Home massage</button><button onClick={() => {setHandoff(true);setMessages(old=>[...old,{role:'assistant',content:'Please share your name and email or phone so our team can follow up.'}]);}}>Talk to customer care</button></div>}
      {!handoff && !ticket && <form className="care-compose" onSubmit={e => {e.preventDefault();send();}}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Message Aviana Care…" maxLength={1200}/><button disabled={!draft.trim() || loading} aria-label="Send"><Send size={16}/></button></form>}
      <p className="care-note">AI assistant. Don’t share passwords, OTPs or payment PINs.</p>
    </section>}
    <button className="care-launcher" onClick={() => setOpen(v=>!v)} aria-label={open?'Close customer care':'Chat with Aviana'}>{open?<X size={22}/>:<MessageCircle size={24}/>}</button>
  </div>;
}