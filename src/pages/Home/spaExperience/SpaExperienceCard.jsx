import React from "react";
import { motion } from "motion/react";

const SpaExperienceCard = ({ item, index }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.8,
        delay: index * 0.15,
        ease: "easeOut",
      }}
      className="group text-center"
    >
      {/* Image */}
      <div className="overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="
            mx-auto
            h-[250px]
            w-full
            max-w-[360px]
            object-contain
            transition-transform
            duration-700
            ease-out
            group-hover:scale-105
            sm:h-[230px]
            lg:h-[240px]
          "
        />
      </div>

      {/* Title */}
      <h3
        className="
          mt-7
          text-[14px]
          font-medium
          tracking-[0.25em]
          text-[#171512]
          transition-colors
          duration-300
          group-hover:text-[#b08d57]
        "
      >
        {item.title}
      </h3>

      {/* Description */}
      <p
        className="
          mx-auto
          mt-6
          max-w-[330px]
          text-sm
          font-light
          leading-7
          text-[#918b84]
        "
      >
        {item.description}
      </p>
    </motion.article>
  );
};

export default SpaExperienceCard;