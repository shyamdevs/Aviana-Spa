import { useState } from "react";
import { AnimatePresence } from "motion/react";
import RitualCard from "./RitualCard";
import RitualFilters from "./RitualFilters";
import PrivilegesRibbon from "./PrivilegesRibbon";
import ConciergeCTA from "./ConciergeCTA";
import { rituals } from "./ritualsData";

export default function SignatureRituals() {
  const [active, setActive] = useState("all");

  const visible = rituals.filter(
    (r) => active === "all" || r.category.includes(active)
  );

  return (
    <section className="relative overflow-hidden bg-[#FDFCF9] py-20">
      <div className="pointer-events-none absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-[#B08D57]/5 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 left-10 h-[450px] w-[450px] rounded-full bg-[#EBBF82]/20 blur-[160px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl text-left">
            <div className="mb-3 inline-flex items-center gap-3">
              <span className="h-px w-8 bg-[#B08D57]/60" />
              <span className="text-xs uppercase tracking-[0.24em] text-[#B08D57]">
                Sacred Formulations & Rituals
              </span>
            </div>
            <h2 className="mb-3 font-serif text-4xl leading-tight text-[#171512]">
              Transcendent Journeys Tailored to Your{" "}
              <span className="italic text-[#B08D57]">Circadian Cadence</span>
            </h2>
            <p className="font-light text-[#928E88]">
              Immerse in multi-hour therapeutic protocols combining ancient thermal
              hydrotherapy, rare wild-harvested botanicals, and meditative sound
              alchemy curated for immediate equilibrium.
            </p>
          </div>

          <RitualFilters active={active} onChange={setActive} />
        </div>

        <div className="mb-20 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((r) => (
              <RitualCard key={r.id} ritual={r} />
            ))}
          </AnimatePresence>
        </div>

        <PrivilegesRibbon />
        <ConciergeCTA />
      </div>
    </section>
  );
}