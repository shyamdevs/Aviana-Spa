import { motion, useReducedMotion } from "motion/react";
import Reveal from "../About/shared/Reveal";
import Label from "../About/shared/Label";
import bandImg from "../../assets/images/h1-parallax-1.jpg";

// Full-width photographic pause between the grid and the closing call-to-action.
export default function GalleryBand() {
  const reduce = useReducedMotion();
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[#1a140e]">
      <motion.img
        src={bandImg}
        alt=""
        loading="lazy"
        initial={reduce ? false : { scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2.4, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[#1a140e]/55" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <Label light>A quiet place</Label>
        </Reveal>
        <Reveal
          as="p"
          delay={0.2}
          duration={1.6}
          className="mt-7 font-serif text-3xl font-light italic leading-[1.5] text-[#FDFCF9] sm:text-4xl lg:text-5xl"
        >
          Luxury is the freedom to slow down.
        </Reveal>
      </div>
    </section>
  );
}
