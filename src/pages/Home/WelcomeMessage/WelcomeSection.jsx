import React from "react";
import WelcomeContent from "./WelcomeContent";
import welcomeBg from "../../../assets/images/h1-parallax-1.jpg";

const WelcomeSection = () => {
  return (
    <section className="relative min-h-[620px] overflow-hidden bg-[#fcfaf7]">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${welcomeBg})` }}
      />

      {/* Soft overlay */}
      <div className="absolute inset-0 bg-white/65" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl items-center justify-center px-6 py-24 text-center sm:px-10 lg:px-12">
        <WelcomeContent />
      </div>
    </section>
  );
};

export default WelcomeSection;