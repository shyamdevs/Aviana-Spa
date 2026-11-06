import Reveal from '../About/shared/Reveal';
import Label from '../About/shared/Label';
import { Link } from 'react-router-dom';

export default function ServiceRow({ service, flip }) {
  return <article id={service.id} className="scroll-mt-28 grid items-center gap-10 lg:grid-cols-12 lg:gap-20">
    <Reveal className={`lg:col-span-7 ${flip ? 'lg:order-2' : ''}`} duration={1.4}>
      <div className="group aspect-[4/3] overflow-hidden lg:aspect-[5/4]"><img src={service.image} alt={service.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"/></div>
    </Reveal>
    <div className={`lg:col-span-5 ${flip ? 'lg:order-1' : ''}`}>
      <Reveal><Label>{service.number}</Label><h3 className="mt-4 font-serif text-3xl font-light uppercase tracking-[0.08em] text-[#171512] sm:text-4xl">{service.title}</h3><p className="mt-5 text-sm font-light leading-8 text-[#918b84] sm:text-base">{service.intro}</p></Reveal>
      <ul className="mt-8 border-t border-[#B08D57]/30">{service.treatments.map((t, i) => <Reveal as="li" key={t.id || t.name} delay={0.1 + i * 0.1} y={12}>
        <div className="flex items-center justify-between gap-4 border-b border-[#B08D57]/30 py-4"><div><p className="font-serif text-lg text-[#171512]">{t.name}</p><p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-[#a98a5b]">{t.time}</p></div><div className="flex items-center gap-4"><span className="text-sm tracking-wide text-[#8f7042]">{t.price}</span><Link to={t.id ? `/booking?service=${t.id}&new=1` : '/booking?new=1'} className="text-[9px] font-medium tracking-[0.18em] text-[#171512] hover:text-[#b08d57]">BOOK</Link></div></div>
      </Reveal>)}</ul>
    </div>
  </article>;
}
