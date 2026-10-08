import React from "react";
import { motion } from "motion/react";

const SalonCard = ({ salon, index }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.8,
        delay: index * 0.12,
        ease: "easeOut",
      }}
      className="px-4 text-center sm:px-6 lg:px-5"
    >
      <h3
        className="
          font-serif text-2xl font-light
          tracking-[0.12em] text-white
          sm:text-[26px]
        "
      >
        {salon.city}
      </h3>

      <div className="mx-auto mt-8 h-px w-20 bg-white/60" />

      <div className="mt-8 space-y-1 text-sm font-light leading-7 text-white/90">
        <p>{salon.address}</p>
        <p>{salon.location}</p>
      </div>

      <div className="mt-7 space-y-1 text-sm font-light leading-7 text-white/90">
        <p>
          Email:{" "}
          <a
            href={`mailto:${salon.email}`}
            className="transition-colors duration-300 hover:text-[#d5b577]"
          >
            {salon.email}
          </a>
        </p>

        <p>
          Phone:{" "}
          <a
            href={`tel:${salon.phone}`}
            className="transition-colors duration-300 hover:text-[#d5b577]"
          >
            {salon.phone}
          </a>
        </p>
      </div>
    </motion.article>
  );
};

export default SalonCard;