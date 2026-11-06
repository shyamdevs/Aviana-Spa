import { motion } from "motion/react";
import FeatureCard from "./WhyChooseCard";
import { features } from "./whyChooseData";

export default function WhyChooseUs() {
  return (
    <section className="relative overflow-hidden bg-[#FDFCF9] px-6 py-28">
      {/* ambient background photo — replace src with your own spa photography */}
      <div className="absolute inset-0">
        <img
          src="https://picsum.photos/seed/aviana-spa/1600/900"
          alt=""
          className="h-full w-full object-cover opacity-[0.05]"
        />
        <div className="absolute inset-0 bg-[#FDFCF9]/95" />
      </div>

      {/* faint lotus watermark, echoes the preloader mark */}
      <svg
        viewBox="0 0 200 160"
        className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 opacity-[0.05]"
        fill="none"
        stroke="#B08D57"
        strokeWidth="2"
      >
        <path d="M20 120 C55 145, 145 145, 180 120" />
        <path d="M100 115 C70 100, 62 65, 85 40 C95 70, 98 95, 100 115 Z" />
        <path d="M100 115 C93 80, 96 40, 100 15 C104 40, 107 80, 100 115 Z" />
        <path d="M100 115 C130 100, 138 65, 115 40 C105 70, 102 95, 100 115 Z" />
        <path d="M100 115 C60 108, 35 85, 30 55" />
        <path d="M100 115 C140 108, 165 85, 170 55" />
      </svg>

      <div className="relative mx-auto max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-4 text-xs font-medium tracking-[0.35em] text-[#B08D57]"
        >
          THE AVIANA DIFFERENCE
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-6 font-serif text-4xl tracking-wide text-[#171512] md:text-5xl"
        >
          WHY CHOOSE US
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mb-20 max-w-2xl text-base leading-relaxed text-[#928E88]"
        >
          From the people we trust to the spaces we create, every detail is
          thoughtfully considered to make your experience feel exceptional.
        </motion.p>

        <div className="grid grid-cols-1 gap-y-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
          {features.map((f, i) => (
            <FeatureCard key={f.number} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}