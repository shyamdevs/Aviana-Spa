import React from 'react';
import { Link } from 'react-router-dom';

const SlideContent = ({ slide }) => {
  return (
    <div className="text-center max-w-2xl px-6 select-none">
      {/* Top Decorative Line */}
      <div className="w-20 h-[2px] bg-[#c29d59] mx-auto mb-6" />

      {/* Main Heading */}
      <h1 className="text-3xl md:text-5xl font-serif tracking-[0.2em] text-[#222222] font-semibold uppercase mb-4 drop-shadow-xs">
        {slide.title}
      </h1>

      {/* Paragraph Text */}
      <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed mb-8 max-w-lg mx-auto">
        {slide.subtitle}
      </p>

      {/* Buttons with Working Hover Effects */}
      <div className="flex flex-wrap items-center justify-center gap-5">
        {/* Primary Button */}
      
      <Link to={"/booking?new=1"}>
        <button className="px-8 py-3.5 bg-[#c29d59] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 ease-in-out hover:bg-[#8c6b2d] hover:scale-105 hover:shadow-xl cursor-pointer">
          {slide.btn1}
        </button>
      </Link>

        {/* Secondary Outline Button */}
        <Link to={"/contact"}>
          <button className="px-8 py-3.5 bg-transparent border-2 border-[#c29d59] text-[#222222] text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 ease-in-out hover:bg-[#c29d59] hover:text-white hover:scale-105 hover:shadow-xl cursor-pointer">
            {slide.btn2}
          </button>
        </Link>
      </div>
    </div>
  );
};

export default SlideContent;