import { motion, useReducedMotion } from "motion/react";
import Label from "../About/shared/Label";
import { mediaUrl } from "../../utils/media";

// Light cream hero. The navbar is transparent with dark text at the top of the
// page, so light heroes keep it readable without touching the navbar.
export default function PageHero({ eyebrow, title, intro, image }) {
  const reduce = useReducedMotion();
  const fade = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <section className="bg-[#f8f5ef] px-6 pb-16 pt-36 sm:px-10 lg:px-12 lg:pb-24 lg:pt-44">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="text-center lg:col-span-6 lg:text-left">
          <motion.div {...fade(0.1)}>
            <Label>{eyebrow}</Label>
          </motion.div>
          <motion.h1
            {...fade(0.3)}
            className="mt-6 font-serif text-5xl font-light uppercase leading-[1.15] tracking-[0.06em] text-[#1c1916] sm:text-6xl"
          >
            {title}
          </motion.h1>
          <motion.div
            {...fade(0.5)}
            className="mx-auto my-8 h-px w-24 bg-[#B08D57] lg:mx-0"
          />
          <motion.p
            {...fade(0.6)}
            className="mx-auto max-w-lg text-sm font-light leading-8 text-[#827b72] sm:text-base lg:mx-0"
          >
            {intro}
          </motion.p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.3, ease: "easeOut" }}
          className="relative lg:col-span-6"
        >
          <div className="aspect-[4/3] overflow-hidden lg:aspect-[5/4]">
            <img
              src={mediaUrl(image)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="pointer-events-none absolute -bottom-4 -left-4 hidden h-2/3 w-2/3 border border-[#B08D57]/40 lg:block" />
        </motion.div>
      </div>
    </section>
  );
}
