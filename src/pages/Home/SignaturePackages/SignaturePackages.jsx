import React from "react";
import { motion } from "motion/react";
import PackageCard from "./PackageCard";
import { packageData } from "./packageData";
import { Link } from "react-router-dom";

const SignaturePackages = () => {
  return (
    <section className="bg-[#f6f2ec] px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8 }}
          className="mx-auto mb-20 max-w-3xl text-center"
        >
          <p
            className="
              text-[10px] font-medium
              tracking-[0.4em] text-[#b08d57]
              sm:text-xs
            "
          >
            CURATED FOR YOU
          </p>

          <h2
            className="
              mt-5 font-serif text-4xl font-light
              uppercase tracking-[0.08em] text-[#171512]
              sm:text-5xl
            "
          >
            Signature Packages
          </h2>

          <p
            className="
              mx-auto mt-6 max-w-2xl
              text-sm font-light leading-7
              text-[#918b84] sm:text-base sm:leading-8
            "
          >
            Indulge in our carefully composed spa journeys,
            created to turn a simple treatment into a complete
            moment of relaxation and renewal.
          </p>
        </motion.div>

        {/* Packages */}
        <div
          className="
            grid grid-cols-1 gap-14
            md:grid-cols-2
            lg:grid-cols-3 lg:gap-8
          "
        >
          {packageData.map((item, index) => (
            <PackageCard
              key={item.id}
              item={item}
              index={index}
            />
          ))}
        </div>

        {/* Bottom Link */}
        <div className="mt-16 text-center">
          <Link
            to="/packages"
            className="
              text-[10px] font-medium
              tracking-[0.25em] text-[#8f7042]
              transition-colors duration-300
              hover:text-[#b08d57]
            "
          >
            VIEW ALL PACKAGES
            <span className="ml-3">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SignaturePackages;