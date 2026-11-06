import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import ValueIcon from "./ValueIcons";
import { values } from "./valuesData";

export default function Values() {
  return (
    <section className="bg-[#FDFCF9] px-6 pb-28 md:pb-40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <Label>What we believe</Label>
          <h2 className="mt-6 font-display text-3xl font-normal uppercase tracking-[0.1em] text-[#171512] sm:text-4xl lg:text-5xl">
            Guided by intention
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 border-y border-[#B08D57]/30 sm:grid-cols-2 md:mt-24 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal
              key={v.key}
              delay={i * 0.15}
              className="border-b border-[#B08D57]/30 px-6 py-14 text-center last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <div className="flex justify-center">
                <ValueIcon name={v.key} />
              </div>
              <h3 className="mt-8 text-xs font-medium uppercase tracking-[0.35em] text-[#171512]">
                {v.title}
              </h3>
              <p className="mx-auto mt-4 max-w-[15rem] font-body text-sm font-light leading-7 tracking-wide text-[#777068]">
                {v.text}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
