import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import heroImg from "../../../assets/images/spa-detail.jpg";
import AboutHeroContent from "./AboutHeroContent";

export default function AboutHero() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#1a140e]">
      <motion.img
        src={heroImg}
        alt=""
        style={{ y }}
        initial={reduce ? false : { scale: 1.12 }}
        animate={{ scale: 1.02 }}
        transition={{ duration: 4, ease: "easeOut" }}
        className="absolute inset-0 h-[115%] w-full object-cover"
      />
      <div className="absolute inset-0 bg-[#1a140e]/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a140e]/50 via-transparent to-[#1a140e]/70" />

      {/* Fine inset frame */}
      <div className="pointer-events-none absolute bottom-6 left-5 right-5 top-24 border border-[#B08D57]/35 sm:bottom-8 sm:left-8 sm:right-8 sm:top-28" />

      <AboutHeroContent />

      <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="text-[9px] uppercase tracking-[0.4em] text-[#D9C4A4]/80">Scroll</span>
        <span className="relative block h-12 w-px overflow-hidden bg-[#B08D57]/30">
          <motion.span
            className="absolute left-0 top-0 h-4 w-px bg-[#D9C4A4]"
            animate={reduce ? {} : { y: [-16, 48] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </div>
    </section>
  );
}
