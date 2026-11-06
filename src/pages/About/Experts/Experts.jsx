import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import ExpertRow from "./ExpertRow";
import { experts } from "./expertData";

export default function Experts() {
  return (
    <section className="bg-[#f6f4ee] px-6 py-28 md:py-40">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <Label>Our Therapists</Label>
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-normal uppercase leading-[1.35] tracking-[0.1em] text-[#171512] sm:text-4xl lg:text-5xl">
            The people behind the experience
          </h2>
        </Reveal>

        <ul className="mt-16 border-t border-[#B08D57]/30 md:mt-24">
          {experts.map((e, i) => (
            <ExpertRow key={e.name} {...e} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
