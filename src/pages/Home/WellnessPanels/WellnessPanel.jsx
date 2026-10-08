import React from "react";
import { motion } from "motion/react";

const WellnessPanel = ({ item, index = 0 }) => {
  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.8,
        delay: index * 0.12,
        ease: "easeOut",
      }}
      className="
        group
        relative
        flex
        h-[430px]
        overflow-hidden
        sm:h-[470px]
        lg:h-[500px]
        cursor-pointer
      "
    >
      {/* Background */}
      <img
        src={item.image}
        alt={item.title}
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover
          transition-transform
          duration-[1200ms]
          ease-out
          group-hover:scale-105
        "
      />

      {/* Overlay */}
      <div
        className="
          absolute
          inset-0
          bg-black/30
          transition-all
          duration-700
          group-hover:bg-black/45
        "
      />

      {/* Content */}
      <div
        className="
          relative
          z-10
          flex
          w-full
          flex-col
          items-center
          justify-center
          px-6
          text-center
          text-white
        "
      >
        {/* Icon */}
        <img
          src={item.icon}
          alt=""
          className="
            mb-9
            h-20
            w-20
            object-contain
            transition-transform
            duration-700
            group-hover:scale-110
          "
        />

        {/* Title */}
        <h3
          className="
            font-serif
            text-4xl
            font-light
            uppercase
            tracking-[0.06em]
            sm:text-5xl
          "
        >
          {item.title}
        </h3>

        {/* Divider */}
        <span
          className="
            mt-12
            h-px
            w-2/3
            max-w-[300px]
            bg-white/75
            transition-all
            duration-500
            group-hover:w-3/4
          "
        />

        {/* Hover text */}
        <span
          className="
            mt-6
            translate-y-2
            text-[9px]
            tracking-[0.3em]
            opacity-0
            transition-all
            duration-500
            group-hover:translate-y-0
            group-hover:opacity-100
          "
        >
          EXPLORE
        </span>
      </div>
    </motion.div>
  );
};

export default WellnessPanel;