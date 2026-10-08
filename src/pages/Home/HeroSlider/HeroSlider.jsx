import React, { useEffect, useState } from 'react';
import { slidesData } from './sliderData';
import SlideContent from './SlideContent';

const HeroSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Next slide
  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === slidesData.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Previous slide
  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? slidesData.length - 1 : prevIndex - 1
    );
  };

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === slidesData.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full h-screen min-h-[600px] overflow-hidden bg-[#fcf8f5]">

      {/* Slider Track */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{
          transform: `translate3d(-${currentIndex * 100}%, 0, 0)`,
        }}
      >
        {slidesData.map((slide) => (
          <div
            key={slide.id}
            className="relative flex h-full w-full min-w-full flex-shrink-0 items-center justify-center bg-cover bg-center"
            style={{
              backgroundImage: `url(${slide.bgImage})`,
            }}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-white/35" />

            {/* Content */}
            <div className="relative z-10">
              <SlideContent slide={slide} />
            </div>
          </div>
        ))}
      </div>

      {/* Previous Button */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous Slide"
        className="
          absolute left-4 md:left-8 top-1/2
          z-30 -translate-y-1/2
          rounded-full
          bg-white/40
          p-3
          text-[#c29d59]
          shadow-md
          transition-all duration-300
          hover:bg-white/80
          hover:text-[#8c6b2d]
          hover:scale-110
          cursor-pointer
        "
      >
        <svg
          className="h-8 w-8 md:h-10 md:w-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Next Button */}
      <button
        type="button"
        onClick={handleNext}
        aria-label="Next Slide"
        className="
          absolute right-4 md:right-8 top-1/2
          z-30 -translate-y-1/2
          rounded-full
          bg-white/40
          p-3
          text-[#c29d59]
          shadow-md
          transition-all duration-300
          hover:bg-white/80
          hover:text-[#8c6b2d]
          hover:scale-110
          cursor-pointer
        "
      >
        <svg
          className="h-8 w-8 md:h-10 md:w-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
        {slidesData.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`
              h-2.5 rounded-full
              transition-all duration-300
              cursor-pointer
              ${
                index === currentIndex
                  ? 'w-8 bg-[#c29d59]'
                  : 'w-2.5 bg-[#c29d59]/40 hover:bg-[#c29d59]/80'
              }
            `}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSlider;