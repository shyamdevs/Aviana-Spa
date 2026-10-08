import React from "react";
import { motion } from "motion/react";
import SalonCard from "./SalonCard";
import { salonData } from "./salonData";
import salonBg from "../../../assets/images/our-salons-bg.webp";
import img3 from "../../../assets/images/h1-custom-icon-3.png";

const OurSalons = () => {
  return (
    <section className="relative min-h-[680px] overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${salonBg})` }}
      />

      {/* Dark luxury overlay */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Warm overlay */}
      <div className="absolute inset-0 bg-[#2b2115]/20" />

      <div className="relative z-10 mx-auto flex min-h-[680px] max-w-[1440px] flex-col justify-center px-6 py-24 sm:px-10 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9 }}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Icon */}
          <div className="flex justify-center">
            <img
              src={img3}
              alt=""
              className="h-14 w-14 object-contain sm:h-16 sm:w-16"
            />
          </div>

          {/* Gold divider */}
          <div className="mx-auto mt-5 h-px w-28 bg-[#c9a45e] sm:w-40" />

          {/* Heading */}
          <h2
            className="
              mt-8 font-serif text-4xl
              font-light uppercase tracking-[0.1em]
              text-white sm:text-5xl lg:text-6xl
            "
          >
            Our Salons
          </h2>

          {/* Description */}
          <p
            className="
              mx-auto mt-7 max-w-4xl
              text-sm font-light leading-7
              text-white/85 sm:text-base sm:leading-8
            "
          >
            Discover our peaceful spaces across the world, each created
            to offer the same thoughtful rituals, refined surroundings,
            and deeply restorative experience.
          </p>
        </motion.div>

        {/* Locations */}
        <div
          className="
            mt-20 grid grid-cols-1 gap-14
            sm:grid-cols-2
            lg:grid-cols-4 lg:gap-0
          "
        >
          {salonData.map((salon, index) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurSalons;