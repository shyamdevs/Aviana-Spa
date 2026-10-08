import { motion } from "motion/react";
import SectionHeading from "../shared/SectionHeading";
import { locations } from "./contactData";

export default function Locations() {
  return (
    <section className="bg-[#171512] px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          light
          eyebrow="Our Salons"
          title="Find a sanctuary near you"
          text="Each location offers the same rituals and the same quiet welcome."
        />
        <div className="mt-20 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {locations.map((s, i) => (
            <motion.article
              key={s.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
              className="text-center lg:border-l lg:border-white/10 lg:px-6 lg:first:border-l-0"
            >
              <h3 className="font-serif text-2xl font-light tracking-[0.12em] text-white">
                {s.city}
              </h3>
              <div className="mx-auto my-6 h-px w-14 bg-[#B08D57]" />
              <p className="text-sm font-light leading-7 text-white/80">{s.address}</p>
              <p className="text-sm font-light leading-7 text-white/80">{s.location}</p>
              <a href={`tel:${s.phone}`} className="mt-4 inline-block text-sm font-light text-[#D9C4A4] transition-colors hover:text-white">
                {s.phone}
              </a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
