import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import Ornament from "../shared/Ornament";
import { stages } from "./approachData";

export default function Approach() {
  return (
    <section id="approach" className="scroll-mt-20 bg-[#171512] px-6 py-28 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <Label light>How we care for you</Label>
          <h2 className="mt-6 font-display text-3xl font-normal uppercase tracking-[0.14em] text-[#FDFCF9] sm:text-4xl lg:text-5xl">
            The Aviana Approach
          </h2>
          <Ornament className="mt-10" />
        </Reveal>

        <div className="mt-20 grid grid-cols-1 gap-20 md:mt-28 md:grid-cols-3 md:gap-0">
          {stages.map((s, i) => (
            <Reveal
              key={s.number}
              delay={i * 0.25}
              duration={1.4}
              className={`px-4 text-center md:px-10 ${
                i > 0 ? "md:border-l md:border-[#B08D57]/30" : ""
              }`}
            >
              <span className="font-display text-7xl font-normal text-transparent [-webkit-text-stroke:1px_#B08D57] sm:text-8xl">
                {s.number}
              </span>
              <h3 className="mt-8 text-xs font-medium uppercase tracking-[0.4em] text-[#E7D9BF]">
                {s.title}
              </h3>
              <p className="mx-auto mt-5 max-w-[16rem] font-body text-sm font-light leading-7 tracking-wide text-[#C9C6C1]">
                {s.text}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
