import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

const PackageCard = ({ item, index }) => {
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
      className="group"
    >
      {/* Image */}
      <div className="relative h-[420px] overflow-hidden sm:h-[460px]">
        <img
          src={item.image}
          alt={item.title}
          className="
            h-full w-full object-cover
            transition-transform duration-1000 ease-out
            group-hover:scale-105
          "
        />

        {/* Overlay */}
        <div
          className="
            absolute inset-0
            bg-black/10
            transition-colors duration-500
            group-hover:bg-black/20
          "
        />

        {/* Floating Label */}
        <div className="absolute bottom-5 left-5 right-5">
          <div
            className="
              border border-white/40
              bg-black/15
              px-5 py-4
              backdrop-blur-[2px]
            "
          >
            <p className="text-[9px] tracking-[0.28em] text-white/80">
              {item.subtitle}
            </p>

            <h3
              className="
                mt-2 font-serif text-2xl
                font-light tracking-[0.08em] text-white
                sm:text-3xl
              "
            >
              {item.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-2 pt-7 text-center">
        <div
          className="
            flex items-center justify-center gap-4
            text-[10px] tracking-[0.2em]
            text-[#a98a5b]
          "
        >
          <span>{item.duration}</span>
          <span className="h-1 w-1 rounded-full bg-[#c9a45e]" />
          <span>{item.price}</span>
        </div>

        <p
          className="
            mx-auto mt-5 max-w-[320px]
            text-sm font-light leading-7
            text-[#918b84]
          "
        >
          {item.description}
        </p>

        <Link
          to="/booking?new=1"
          className="
            mt-6 inline-flex items-center gap-3
            border-b border-[#b08d57]
            pb-2 text-[10px] font-medium
            tracking-[0.24em] text-[#8f7042]
            transition-colors duration-300
            hover:text-[#b08d57]
          "
        >
          BOOK THIS RITUAL
          <span className="text-sm">→</span>
        </Link>
      </div>
    </motion.article>
  );
};

export default PackageCard;