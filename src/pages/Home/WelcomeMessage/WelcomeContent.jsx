import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

const MotionLink = motion.create(Link);

const WelcomeContent = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="max-w-4xl"
    >
      {/* Lotus / Decorative Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-6 flex justify-center"
      >
        <span className="text-4xl font-light text-[#c9a45e]">❋</span>
      </motion.div>

      {/* Gold Line */}
      <div className="mx-auto mb-8 h-px w-28 bg-[#c9a45e] sm:w-40" />

      {/* Eyebrow */}
      <p className="mb-5 text-[10px] font-medium tracking-[0.4em] text-[#b08d57] sm:text-xs">
        WELCOME TO AVIANA
      </p>

      {/* Heading */}
      <h2 className="font-serif text-4xl font-light uppercase leading-tight tracking-[0.08em] text-[#1d1a17] sm:text-5xl lg:text-6xl">
        Where Elegance
        <span className="block">Dwells</span>
      </h2>

      {/* Description */}
      <p className="mx-auto mt-7 max-w-2xl text-sm font-light leading-7 tracking-wide text-[#777068] sm:text-base sm:leading-8">
        Step into a sanctuary of stillness, where thoughtful rituals,
        calming surroundings, and timeless wellness come together.
        Every experience is created to restore balance, soothe the mind,
        and leave you beautifully renewed.
      </p>

      {/* CTA */}
      <MotionLink
        to="/about"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="mt-8 inline-block border border-[#b08d57] px-8 py-3.5 text-[10px] font-medium tracking-[0.25em] text-[#8f7042] transition-all duration-300 hover:bg-[#b08d57] hover:text-white"
      >
        DISCOVER OUR STORY
      </MotionLink>
    </motion.div>
  );
};

export default WelcomeContent;