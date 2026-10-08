import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import CountUp from "../shared/CountUp";
import { milestones } from "./milestonesData";

export default function Milestones() {
  return (
    <section className="bg-[#eee8db] px-6 py-28 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <Label>In numbers</Label>
          <h2 className="mt-6 font-display text-3xl font-normal uppercase tracking-[0.1em] text-[#171512] sm:text-4xl">
            Our Journey
          </h2>
          <div className="mx-auto mt-8 h-px w-16 bg-[#B08D57]" />
        </Reveal>

        <div className="mt-20 grid grid-cols-2 gap-y-16 md:mt-28 lg:grid-cols-4">
          {milestones.map((m, i) => (
            <Reveal
              key={m.label}
              delay={i * 0.15}
              className="text-center lg:border-l lg:border-[#B08D57]/30 lg:first:border-l-0"
            >
              <p className="font-display text-5xl font-normal text-[#171512] sm:text-6xl lg:text-7xl">
                <CountUp value={m.value} />
              </p>
              <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.35em] text-[#8f7042] sm:text-[11px]">
                {m.label}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
