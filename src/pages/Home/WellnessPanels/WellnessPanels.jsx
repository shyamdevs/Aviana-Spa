import React from "react";
import { motion } from "motion/react";
import WellnessPanel from "./WellnessPanel";
import { wellnessData } from "./wellnessData";

const WellnessPanels = () => {
  return (
    <section className="w-full bg-[#fdfcf9]">
      {/* Optional Section Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="px-6 py-20 text-center sm:py-24"
      >
        <p className="text-[10px] font-medium tracking-[0.4em] text-[#b08d57]">
          DISCOVER YOUR RITUAL
        </p>

        <h2
          className="
            mt-5
            font-serif
            text-4xl
            font-light
            uppercase
            tracking-[0.08em]
            text-[#171512]
            sm:text-5xl
          "
        >
          Explore Our Wellness
        </h2>
      </motion.div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {wellnessData.map((item, index) => (
          <WellnessPanel
            key={item.id}
            item={item}
            index={index}
          />
        ))}
      </div>
    </section>
  );
};

export default WellnessPanels;