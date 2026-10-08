import { motion } from "motion/react";
import Reveal from "../shared/Reveal";
import hydro from "../../../assets/images/hydrotherapy.jpg";
import aroma from "../../../assets/images/aromatherapy.jpg";
import room from "../../../assets/images/massageRoom.jpg";

// Asymmetric image grid: one wide, one tall, one square.
const spaces = [
  { title: "The Thermal Suite", note: "Water & warmth", image: hydro, cls: "md:col-span-7 aspect-[16/10]" },
  { title: "The Aroma Room", note: "Botanical blends", image: aroma, cls: "md:col-span-5 aspect-[4/5] md:row-span-2 md:aspect-auto" },
  { title: "The Treatment Suite", note: "Quiet, private, unhurried", image: room, cls: "md:col-span-7 aspect-[16/10]" },
];

export default function SanctuaryMosaic() {
  return (
    <section className="bg-[#FDFCF9] px-4 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-12 md:gap-4">
        {spaces.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.12} duration={1.4} className={`group relative overflow-hidden bg-[#eee8db] ${s.cls}`}>
            <motion.img
              src={s.image}
              alt={s.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a140e]/70 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-6 right-6">
              <p className="text-[9px] uppercase tracking-[0.35em] text-[#E7D9BF]">{s.note}</p>
              <h3 className="mt-2 font-display text-2xl font-normal text-[#FDFCF9]">{s.title}</h3>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
