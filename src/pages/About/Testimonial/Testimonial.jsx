import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import Lotus from "../shared/Lotus";
import { testimonials } from "./testimonialData";

export default function Testimonial() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Gentle auto-advance; pauses on hover/focus and when motion is reduced.
  useEffect(() => {
    if (paused || reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), 7000);
    return () => clearInterval(t);
  }, [paused, reduce]);

  const current = testimonials[index];

  return (
    <section
      className="bg-[#f6f4ee] px-6 py-28 md:py-40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mx-auto max-w-4xl text-center">
        <Reveal duration={1.6}>
          <div className="mb-8 flex justify-center">
            <Lotus className="h-7 w-9" />
          </div>
          <Label>Guest Experience</Label>
        </Reveal>

        <div className="mt-10 min-h-[15rem] sm:min-h-[13rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? {} : { opacity: 0, y: -10 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <blockquote className="font-display text-2xl font-normal italic leading-[1.5] tracking-wide text-[#171512] sm:text-3xl lg:text-4xl">
                “{current.quote}”
              </blockquote>
              <figcaption className="mt-8 font-body text-xs font-light uppercase tracking-[0.3em] text-[#928E88]">
                — {current.author}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex justify-center">
          {testimonials.map((t, i) => (
            <button
              key={t.author}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show testimonial ${i + 1}`}
              aria-current={i === index}
              className="flex h-11 w-8 items-center justify-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-500 ${
                  i === index ? "w-6 bg-[#B08D57]" : "w-1.5 bg-[#B08D57]/30 hover:bg-[#B08D57]/60"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
