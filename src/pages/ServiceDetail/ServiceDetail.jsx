import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../../layout/Navbar/Navbar';
import LuxuryFooter from '../../layout/Footer/footer';
import MediaImage from '../../components/MediaImage';
import { api } from '../../services/api';
import { money } from '../../utils/format';

export default function ServiceDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const therapistId = searchParams.get('therapist') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/services/${id}`).then(setData).catch((e) => setError(e.message)); }, [id]);
  const bookingHref = `/booking?service=${encodeURIComponent(id)}${therapistId ? `&therapist=${encodeURIComponent(therapistId)}` : ''}&new=1`;
  if (error) return <div className="min-h-screen bg-[#fdfcf9]"><Navbar /><main className="mx-auto max-w-3xl px-6 pb-24 pt-40"><p className="text-red-600">{error}</p><Link to="/services" className="mt-6 inline-block text-xs tracking-[0.18em] text-[#b08d57]">← BACK TO SERVICES</Link></main><LuxuryFooter /></div>;
  if (!data) return <div className="min-h-screen bg-[#fdfcf9]"><Navbar /><main className="mx-auto max-w-7xl px-6 pb-24 pt-40"><div className="animate-pulse grid gap-8 lg:grid-cols-2"><div className="aspect-[5/4] bg-[#eee8df]"/><div className="space-y-5"><div className="h-5 w-28 bg-[#eee8df]"/><div className="h-12 w-3/4 bg-[#eee8df]"/><div className="h-24 bg-[#eee8df]"/></div></div></main></div>;
  const { service, therapists = [] } = data;
  return <div className="overflow-x-clip bg-[#fdfcf9]"><Navbar /><main className="px-6 pb-28 pt-36 sm:px-10 lg:px-12 lg:pt-44"><div className="mx-auto max-w-7xl"><div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20"><MediaImage src={service.image} name={service.title} alt={service.title} wrapperClassName="aspect-[5/4]" className="h-full w-full object-cover"/><div className="lg:pt-8"><p className="text-[10px] uppercase tracking-[0.22em] text-[#b08d57]">{service.category}</p><h1 className="mt-3 font-serif text-5xl font-light sm:text-6xl">{service.title}</h1><p className="mt-7 max-w-2xl text-sm leading-8 text-[#7c725f]">{service.description}</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><Info label="Duration" value={`${service.durationMinutes} min`} /><Info label="Spa" value={money(service.spaPrice)} /><Info label="Home" value={service.homeServiceAvailable ? money(service.homePrice) : 'Not offered'} /></div><Link to={bookingHref} className="mt-10 inline-flex min-h-12 items-center bg-[#201e1a] px-7 py-4 text-[10px] tracking-[0.2em] text-white">BOOK THIS TREATMENT</Link></div></div><section className="mt-24 border-t border-[#ded7cc] pt-16"><p className="text-[10px] uppercase tracking-[0.22em] text-[#b08d57]">Your possible match</p><h2 className="mt-3 font-serif text-4xl">Therapists trained for this ritual</h2>{therapists.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{therapists.map((therapist) => <Link key={therapist._id} to={`/therapists/${therapist._id}`} className="group border border-black/5 bg-white p-3"><MediaImage src={therapist.profileImage} name={therapist.name} alt={therapist.name} wrapperClassName="aspect-[4/5]" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="p-4"><h3 className="font-serif text-xl">{therapist.name}</h3><p className="mt-1 text-xs text-[#7c725f]">{therapist.specialization}</p></div></Link>)}</div> : <p className="mt-6 text-sm text-[#7c725f]">We will match the best available therapist when you choose a date.</p>}</section></div></main><LuxuryFooter /></div>;
}
function Info({ label, value }) { return <div className="border border-[#e1d9ce] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#9a8f81]">{label}</p><p className="mt-2 font-serif text-xl">{value}</p></div>; }
