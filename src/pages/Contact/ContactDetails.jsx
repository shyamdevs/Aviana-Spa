import Reveal from "../About/shared/Reveal";
import Label from "../About/shared/Label";
import { details, hours } from "./contactData";
import img from "../../assets/images/spa-interior.jpg";

export default function ContactDetails() {
  return (
    <div>
      <Reveal>
        <div className="aspect-[4/3] overflow-hidden">
          <img src={img} alt="Aviana spa interior" loading="lazy" className="h-full w-full object-cover" />
        </div>
      </Reveal>

      <dl className="mt-12 space-y-8">
        {details.map((d, i) => (
          <Reveal key={d.label} delay={i * 0.1} y={12}>
            <div className="grid grid-cols-[80px_1fr] gap-4 border-t border-[#B08D57]/30 pt-6">
              <dt><Label>{d.label}</Label></dt>
              <dd className="text-sm font-light leading-7 text-[#4a4a4a]">
                {d.href ? (
                  <a href={d.href} className="transition-colors duration-300 hover:text-[#B08D57]">
                    {d.lines[0]}
                  </a>
                ) : (
                  d.lines.map((l) => <p key={l}>{l}</p>)
                )}
              </dd>
            </div>
          </Reveal>
        ))}
      </dl>

      <Reveal delay={0.2} y={12}>
        <div className="mt-10 border-t border-[#B08D57]/30 pt-6">
          <Label>Opening hours</Label>
          <ul className="mt-5 space-y-3 text-sm font-light text-[#4a4a4a]">
            {hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4">
                <span>{h.days}</span>
                <span className="text-[#8f7042]">{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
