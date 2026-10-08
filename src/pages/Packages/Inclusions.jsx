import Reveal from "../About/shared/Reveal";
import Label from "../About/shared/Label";
import { inclusions } from "./packagesData";

export default function Inclusions() {
  return (
    <section className="border-y border-[#B08D57]/25 bg-[#f6f2ec] px-6 py-16 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <Reveal className="text-center">
          <Label>Included with every package</Label>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 text-center lg:grid-cols-4">
          {inclusions.map((text, i) => (
            <Reveal as="li" key={text} delay={i * 0.1} y={12}>
              <span className="mx-auto mb-4 block h-px w-8 bg-[#B08D57]" />
              <span className="font-serif text-base font-light text-[#171512] sm:text-lg">
                {text}
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
