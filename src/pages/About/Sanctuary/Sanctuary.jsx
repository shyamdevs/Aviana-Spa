import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Reveal from "../shared/Reveal";
import Ornament from "../shared/Ornament";
import SanctuaryMosaic from "./SanctuaryMosaic";
import bg from "../../../assets/images/spa-room.jpg";

export default function Sanctuary() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-10%", "10%"]);

  return (
    <>
      <section ref={ref} className="relative flex min-h-[85svh] items-center justify-center overflow-hidden bg-[#1a140e] px-6 py-28">
        <motion.img src={bg} alt="" loading="lazy" style={{ y }} className="absolute inset-0 h-[120%] w-full -translate-y-[8%] object-cover" />
        <div className="absolute inset-0 bg-[#1a140e]/65" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Reveal duration={1.6}>
            <Ornament />
          </Reveal>
          <Reveal
            as="h2"
            delay={0.2}
            duration={1.6}
            className="mt-10 font-display text-3xl font-normal uppercase leading-[1.3] tracking-[0.14em] text-[#FDFCF9] sm:text-4xl lg:text-5xl"
          >
            The Sanctuary Experience
          </Reveal>
          <Reveal delay={0.5} duration={1.6}>
            <p className="mt-8 font-display text-lg font-normal italic tracking-wide text-[#E7D9BF] sm:text-2xl">
              Private spaces. Thoughtful rituals. Unhurried moments.
            </p>
            <p className="mx-auto mt-6 max-w-md font-body text-sm font-light leading-7 tracking-wide text-[#F1EBDF]/85">
              Every element of Aviana is designed to create a sense of calm from
              the moment you arrive.
            </p>
          </Reveal>
        </div>
      </section>
      <SanctuaryMosaic />
    </>
  );
}
