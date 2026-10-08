import React from "react";
import { motion } from "motion/react";
import SpaExperienceCard from "./SpaExperienceCard";
import { spaExperienceData } from "./spaExperienceData";
import img3 from "../../../assets/images/h1-custom-icon-3.png";
import { Link } from "react-router-dom";

const SpaExperience = () => {
  return (
    <section className="bg-[#fdfcf9] px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto mb-20 max-w-4xl text-center"
        >
          {/* Decorative Icon */}
          <div className="mb-5 flex justify-center">
            <img
              src={img3}
              alt="Spa experience"
              className="h-14 w-14 object-contain sm:h-16 sm:w-16"
            />
          </div>

          {/* Gold Divider */}
          <div className="mx-auto h-px w-28 bg-[#c9a45e] sm:w-40" />

          {/* Eyebrow */}
          <p
            className="
              mt-7
              text-[10px]
              font-medium
              tracking-[0.4em]
              text-[#b08d57]
              sm:text-xs
            "
          >
            THE ART OF WELLNESS
          </p>

          {/* Heading */}
          <h2
            className="
              mt-5
              font-serif
              text-4xl
              font-light
              uppercase
              leading-tight
              tracking-[0.08em]
              text-[#171512]
              sm:text-5xl
            "
          >
            Enjoy The Difference
          </h2>

          {/* Description */}
          <p
            className="
              mx-auto
              mt-6
              max-w-3xl
              text-sm
              font-light
              leading-7
              text-[#918b84]
              sm:text-base
              sm:leading-8
            "
          >
            Discover thoughtfully designed rituals that restore the body,
            refresh the senses, and bring you back to a feeling of balance
            and calm.
          </p>
        </motion.div>

        {/* Experience Cards */}
        <div
          className="
            grid
            grid-cols-1
            gap-16
            sm:grid-cols-2
            lg:grid-cols-3
            lg:gap-10
          "
        >
          {spaExperienceData.map((item, index) => (
            <SpaExperienceCard
              key={item.id}
              item={item}
              index={index}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-16 text-center"
        >
          <Link
            to="/services"
            className="
              inline-flex
              items-center
              gap-3
              border-b
              border-[#b08d57]
              pb-2
              text-[10px]
              font-medium
              tracking-[0.25em]
              text-[#8f7042]
              transition-colors
              duration-300
              hover:text-[#b08d57]
            "
          >
            EXPLORE OUR EXPERIENCES
            <span className="text-sm">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default SpaExperience;