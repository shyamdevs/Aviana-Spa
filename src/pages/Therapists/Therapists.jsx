import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../layout/Navbar/Navbar';
import LuxuryFooter from '../../layout/Footer/footer';
import PageHero from '../shared/PageHero';
import PageCTA from '../shared/PageCTA';
import MediaImage from '../../components/MediaImage';
import { api } from '../../services/api';
import heroImage from '../../assets/images/spa-interior.jpg';

const filters = [{ value: 'any', label: 'All' }, { value: 'female', label: 'Women' }, { value: 'male', label: 'Men' }];

export default function Therapists() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('any');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { const result = await api.get(`/therapists${filter !== 'any' ? `?gender=${filter}` : ''}`); setItems(result.therapists || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { let cancelled = false; setLoading(true); setError(''); api.get(`/therapists${filter !== 'any' ? `?gender=${filter}` : ''}`).then((result) => { if (!cancelled) setItems(result.therapists || []); }).catch((err) => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [filter]);
  const copy = useMemo(() => filter === 'female' ? 'Meet the women behind our most restorative rituals.' : filter === 'male' ? 'Meet the men bringing thoughtful, professional bodywork to Aviana.' : 'Eight carefully selected therapists, each with a distinct craft and a shared respect for quiet care.', [filter]);

  return <div className="overflow-x-clip bg-[#fdfcf9]"><Navbar /><PageHero eyebrow="The Aviana Team" title="Meet Our Therapists" intro={copy} image={heroImage} />
    <section className="px-6 py-20 sm:px-10 lg:px-12 lg:py-28"><div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-5"><p className="max-w-2xl text-sm leading-7 text-[#7c725f]">Professional, caring and experienced. Choose a therapist who feels right for your ritual.</p><div className="flex gap-2 rounded-full border border-[#ddd4c7] bg-white/70 p-1">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`min-h-10 rounded-full px-5 text-[10px] tracking-[0.18em] transition ${filter === item.value ? 'bg-[#201e1a] text-white' : 'text-[#7c725f] hover:text-[#201e1a]'}`}>{item.label.toUpperCase()}</button>)}</div></div>
      {loading ? <TherapistSkeleton /> : error ? <div className="mt-12 border border-red-200 bg-red-50 p-8 text-sm text-red-700"><p>{error}</p><button onClick={load} className="mt-5 text-[10px] tracking-[0.18em]">RETRY</button></div> : !items.length ? <div className="mt-12 border border-black/5 bg-white p-10 text-center"><h2 className="font-serif text-3xl">No therapists found.</h2><p className="mt-3 text-sm text-[#7c725f]">Try another preference.</p></div> : <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{items.map((therapist) => <TherapistCard key={therapist._id} therapist={therapist} />)}</div>}
    </div></section><PageCTA title="Ready to choose your ritual?" text="Tell us the treatment, day and preference. We will take care of the rest." secondary={{ label: 'Book an appointment', href: '/booking?new=1' }} /><LuxuryFooter /></div>;
}

function TherapistCard({ therapist }) {
  return <article className="group border border-black/5 bg-white p-3 transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(55,43,28,0.08)]"><Link to={`/therapists/${therapist._id}`} className="block"><MediaImage src={therapist.profileImage} name={therapist.name} alt={`${therapist.name}, Aviana therapist`} wrapperClassName="aspect-[4/5]" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-xl">{therapist.name}</h2><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#b08d57]">{therapist.gender === 'female' ? 'Woman' : 'Man'}</p></div><span className="text-sm text-[#8f7042]">★ {Number(therapist.rating || 0).toFixed(1)}</span></div><p className="mt-3 text-sm leading-6 text-[#7c725f]">{therapist.specialization}</p><p className="mt-3 text-xs text-[#9b9184]">{therapist.experience}+ years experience</p><span className="mt-5 inline-block text-[10px] tracking-[0.18em] text-[#201e1a]">VIEW PROFILE →</span></div></Link></article>;
}

function TherapistSkeleton() { return <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="animate-pulse border border-black/5 bg-white p-3"><div className="aspect-[4/5] bg-[#eee8df]"/><div className="space-y-3 p-4"><div className="h-5 w-2/3 bg-[#eee8df]"/><div className="h-3 w-1/2 bg-[#eee8df]"/><div className="h-3 w-4/5 bg-[#eee8df]"/></div></div>)}</div>; }
