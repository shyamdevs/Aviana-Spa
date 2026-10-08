import { motion } from "motion/react";
import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import { story } from "./storyData";

export default function OurStory() {
  return (
    <section className="bg-[#FDFCF9] px-6 py-28 md:py-36 lg:py-44">
      <div className="mx-auto grid max-w-7xl items-center gap-24 lg:grid-cols-12 lg:gap-8">
        {/* Overlapping editorial images */}
        <Reveal duration={1.6} className="pb-16 pr-8 sm:pr-16 lg:col-span-6 lg:pb-20">
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden bg-[#eee8db]">
              <motion.img
                src={story.image}
                alt={story.imageAlt}
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-14 -right-8 w-1/2 border-[10px] border-[#FDFCF9] sm:-right-16">
              <div className="aspect-square overflow-hidden bg-[#eee8db]">
                <motion.img
                  src={story.inset}
                  alt={story.insetAlt}
                  loading="lazy"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <span className="pointer-events-none absolute -left-4 -top-4 hidden h-28 w-28 border-l border-t border-[#B08D57]/60 lg:block" />
          </div>
        </Reveal>

        <div className="text-center md:text-left lg:col-span-5 lg:col-start-8">
          <Reveal delay={0.15}>
            <div className="mx-auto mb-7 h-px w-14 bg-[#B08D57] md:mx-0" />
            <Label>{story.label}</Label>
          </Reveal>

          <Reveal
            as="h2"
            delay={0.3}
            className="mt-6 font-display text-3xl font-normal leading-[1.3] tracking-[0.04em] text-[#171512] sm:text-4xl lg:text-5xl"
          >
            {story.heading}
          </Reveal>

          <Reveal delay={0.45}>
            <div className="mt-8 space-y-5 font-body text-sm font-light leading-8 tracking-wide text-[#777068] sm:text-base">
              {story.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <a
              href={story.cta.href}
              className="group mt-10 inline-flex min-h-11 items-center gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-[#8f7042]"
            >
              <span className="border-b border-[#B08D57]/50 pb-1 transition-colors duration-500 group-hover:border-[#B08D57]">
                {story.cta.text}
              </span>
              <span className="transition-transform duration-500 group-hover:translate-x-1.5">→</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
