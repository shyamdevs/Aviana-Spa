import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../layout/Navbar/Navbar';
import LuxuryFooter from '../../layout/Footer/footer';
import PageHero from '../shared/PageHero';
import PageCTA from '../shared/PageCTA';
import VisitSteps from './VisitSteps';
import MediaImage from '../../components/MediaImage';
import { api } from '../../services/api';
import { money } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import heroImg from '../../assets/images/massageRoom.jpg';
import massageImg from '../../assets/images/massage.jpg';
import facialImg from '../../assets/images/facial.jpg';
import hydroImg from '../../assets/images/hydrotherapy.jpg';
import aromaImg from '../../assets/images/aromatherapy.jpg';
import saunaImg from '../../assets/images/sauna.jpg';

const categoryMeta = {
  'Massage Therapy': { image: massageImg, intro: 'Slow, intentional touch to release tension held deep in the body.' },
  'Facial Rituals': { image: facialImg, intro: 'Gentle, botanical facials that bring back a calm, natural glow.' },
  Hydrotherapy: { image: hydroImg, intro: 'Warm mineral water and quiet surroundings for weightless rest.' },
  Aromatherapy: { image: aromaImg, intro: 'Pure essential oils blended for you, to settle the mind and senses.' },
  'Heat & Stillness': { image: saunaImg, intro: 'Heat, breath and quiet to warm the body and clear the head.' },
  Therapeutic: { image: massageImg, intro: 'Thoughtful recovery bodywork for active and overworked bodies.' },
  Relaxation: { image: relaxImg, intro: 'Focused, calming work to soften screen fatigue and mental noise.' },
  'Wellness Rituals': { image: spaDetailImg, intro: 'Layered wellness rituals that let you fully switch off.' },
};

import relaxImg from '../../assets/images/relax.jpg';
import spaDetailImg from '../../assets/images/spa-detail.jpg';

export default function Services() {
  const [services, setServices] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [servicesResponse, therapistsResponse] = await Promise.all([api.get('/services'), api.get('/therapists')]);
      setServices(servicesResponse.services || []); setTherapists(therapistsResponse.therapists || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const result = {};
    services.forEach((item) => { (result[item.category] ||= []).push(item); });
    return Object.entries(result).map(([category, items], index) => ({ category, items, number: String(index + 1).padStart(2, '0'), ...(categoryMeta[category] || { image: items[0]?.image || massageImg, intro: items[0]?.description || '' }) }));
  }, [services]);
  const filteredTherapists = filter === 'all' ? therapists : therapists.filter((item) => item.gender === filter);

  return <div className="overflow-x-clip bg-[#fdfcf9]"><Navbar /><PageHero eyebrow="Treatments & Rituals" title="Our Services" intro="Thoughtfully composed treatments, delivered in quiet rooms by therapists who take their time." image={heroImg}/>
    <section className="px-6 py-20 sm:px-10 lg:px-12 lg:py-32"><div className="mx-auto max-w-7xl">
      {loading ? <ServiceSkeleton /> : error ? <ErrorState message={error} retry={load} /> : !services.length ? <EmptyState title="Our treatment menu is being prepared." text="Please check back shortly." /> : <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map((service) => <Link key={service._id} to={`/services/${service._id}`} className="group border border-black/5 bg-white p-3"><MediaImage src={service.image} name={service.title} alt={service.title} wrapperClassName="aspect-[4/3]" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#b08d57]">{service.category}</p><h2 className="mt-2 font-serif text-xl">{service.title}</h2><div className="mt-3 flex items-center justify-between text-xs text-[#7c725f]"><span>{service.durationMinutes} min</span><span>{money(service.spaPrice)}</span></div></div></Link>)}</div><div className="mt-20 space-y-24 lg:space-y-36">{groups.map((group, index) => <ServiceGroup key={group.category} group={group} flip={index % 2 === 1}/>)}</div></>}
    </div></section>
    {!loading && !error && <section className="border-y border-[#d9d0c3] bg-[#f5f0e8] px-6 py-20 sm:px-10 lg:px-12 lg:py-28"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="text-[10px] uppercase tracking-[0.22em] text-[#b08d57]">The Aviana Team</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Meet Our Therapists</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#7c725f]">Eight professional therapists with different strengths, one shared approach to quiet, respectful care.</p></div><div className="flex flex-wrap gap-2">{['all','female','male'].map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 rounded-full border px-5 text-[10px] tracking-[0.18em] ${filter === value ? 'border-[#201e1a] bg-[#201e1a] text-white' : 'border-[#d8d0c2] bg-white text-[#6d6459]'}`}>{value === 'all' ? 'ALL' : value === 'female' ? 'WOMEN' : 'MEN'}</button>)}<Link to="/therapists" className="min-h-10 rounded-full border border-[#b08d57] px-5 py-3 text-[10px] tracking-[0.18em] text-[#8f7042]">VIEW ALL</Link></div></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filteredTherapists.map((therapist) => <TherapistMini key={therapist._id} therapist={therapist}/>)}</div></div></section>}
    <VisitSteps/><PageCTA title="Find your ritual" text="Not sure where to begin? Our concierge will guide you to the right treatment." secondary={{ label:'View packages', href:'/packages' }}/><LuxuryFooter/></div>;
}

function ServiceGroup({ group, flip }) { return <article className="grid items-center gap-10 lg:grid-cols-12 lg:gap-20"><div className={`lg:col-span-7 ${flip ? 'lg:order-2' : ''}`}><div className="group aspect-[5/4] overflow-hidden"><img src={mediaUrl(group.image)} alt={group.category} loading="lazy" className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-105" /></div></div><div className={`lg:col-span-5 ${flip ? 'lg:order-1' : ''}`}><span className="text-[10px] tracking-[0.22em] text-[#b08d57]">{group.number}</span><h2 className="mt-4 font-serif text-4xl font-light uppercase tracking-[0.06em] sm:text-5xl">{group.category}</h2><p className="mt-5 text-sm leading-8 text-[#7c725f]">{group.intro}</p><div className="mt-8 border-t border-[#b08d57]/30">{group.items.map((item) => <div key={item._id} className="flex flex-col gap-3 border-b border-[#b08d57]/30 py-5 sm:flex-row sm:items-center sm:justify-between"><div><Link to={`/services/${item._id}`} className="font-serif text-lg hover:text-[#8f7042]">{item.title}</Link><p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#a98a5b]">{item.durationMinutes} min</p></div><div className="flex items-center justify-between gap-5 sm:justify-end"><span className="text-sm text-[#8f7042]">{money(item.spaPrice)}</span><Link to={`/booking?service=${item.slug}&new=1`} className="text-[9px] tracking-[0.18em] text-[#201e1a] hover:text-[#b08d57]">BOOK</Link></div></div>)}</div></div></article>; }
function TherapistMini({ therapist }) { return <Link to={`/therapists/${therapist._id}`} className="group border border-black/5 bg-white p-3"><MediaImage src={therapist.profileImage} name={therapist.name} alt={therapist.name} wrapperClassName="aspect-[4/5]" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-serif text-xl">{therapist.name}</h3><span className="text-xs text-[#8f7042]">★ {Number(therapist.rating || 0).toFixed(1)}</span></div><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#b08d57]">{therapist.gender === 'female' ? 'Woman' : 'Man'}</p><p className="mt-3 text-xs text-[#7c725f]">{therapist.specialization}</p><p className="mt-3 text-[10px] tracking-[0.16em] text-[#201e1a]">VIEW PROFILE →</p></div></Link>; }
function ServiceSkeleton() { return <div className="space-y-24">{Array.from({ length: 3 }).map((_,i)=><div key={i} className="grid animate-pulse gap-10 lg:grid-cols-12 lg:gap-20"><div className="aspect-[5/4] bg-[#eee8df] lg:col-span-7"/><div className="space-y-5 lg:col-span-5"><div className="h-8 w-2/3 bg-[#eee8df]"/><div className="h-20 bg-[#eee8df]"/><div className="h-12 bg-[#eee8df]"/></div></div>)}</div>; }
function ErrorState({ message, retry }) { return <div className="border border-red-200 bg-red-50 p-8 text-sm text-red-700"><p>{message}</p><button onClick={retry} className="mt-5 text-[10px] tracking-[0.18em]">RETRY</button></div>; }
function EmptyState({ title, text }) { return <div className="border border-black/5 bg-white p-10 text-center"><h2 className="font-serif text-3xl">{title}</h2><p className="mt-3 text-sm text-[#7c725f]">{text}</p></div>; }
