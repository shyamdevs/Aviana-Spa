import React from "react";
import { motion } from "motion/react";

const sizeClasses = {
  large: "md:col-span-2 md:row-span-2",
  tall: "md:row-span-2",
  wide: "md:col-span-2",
  normal: "",
};

const GalleryItem = ({ item, onOpen }) => {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7 }}
      onClick={() => onOpen(item)}
      className={`
        group relative block min-h-[300px] w-full
        overflow-hidden text-left
        ${sizeClasses[item.size]}
      `}
    >
      <img
        src={item.image}
        alt={item.title}
        className="
          absolute inset-0 h-full w-full object-cover
          transition-transform duration-1000 ease-out
          group-hover:scale-105
        "
      />

      <div className="
        absolute inset-0 bg-black/0
        transition-colors duration-500
        group-hover:bg-black/30
      " />

      <div className="
        absolute inset-x-0 bottom-0
        translate-y-3 px-6 pb-6
        opacity-0 transition-all duration-500
        group-hover:translate-y-0
        group-hover:opacity-100
      ">
        <p className="
          text-[9px] font-medium tracking-[0.3em]
          text-[#e7c98f]
        ">
          {item.category}
        </p>

        <h3 className="
          mt-2 font-serif text-2xl
          font-light text-white
        ">
          {item.title}
        </h3>
      </div>
    </motion.button>
  );
};

export default GalleryItem;