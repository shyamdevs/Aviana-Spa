import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import GalleryItem from "./GalleryItem";
import { galleryData } from "./galleryData";

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    document.body.style.overflow = selectedImage ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  // Close the lightbox with the Escape key.
  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e) => e.key === "Escape" && setSelectedImage(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedImage]);

  return (
    <main className="bg-[#f8f5ef]">
      {/* Header */}
      <section className="px-6 pb-16 pt-36 text-center sm:px-10 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="mx-auto max-w-3xl"
        >
          <div className="mb-6 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-[#b08d57]/50" />
            <span className="
              text-[9px] font-medium
              tracking-[0.4em] text-[#b08d57]
            ">
              THE AVIANA EXPERIENCE
            </span>
            <span className="h-px w-12 bg-[#b08d57]/50" />
          </div>

          <h1 className="
            font-serif text-5xl font-light
            uppercase tracking-[0.06em]
            text-[#1c1916] sm:text-6xl
          ">
            Our Gallery
          </h1>

          <p className="
            mx-auto mt-6 max-w-2xl
            text-sm font-light leading-8
            text-[#827b72] sm:text-base
          ">
            A glimpse into the spaces, rituals, and quiet moments
            that shape the Aviana experience.
          </p>
        </motion.div>
      </section>

      {/* Gallery */}
      <section className="px-4 pb-28 sm:px-8 lg:px-12">
        <div className="
          mx-auto grid max-w-7xl
          grid-cols-1 auto-rows-[260px]
          gap-3 sm:auto-rows-[300px]
          md:grid-cols-3
        ">
          {galleryData.map((item) => (
            <GalleryItem
              key={item.id}
              item={item}
              onOpen={setSelectedImage}
            />
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedImage.title}
          className="
            fixed inset-0 z-[9999]
            flex items-center justify-center
            bg-black/90 p-5
          "
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            aria-label="Close image"
            onClick={() => setSelectedImage(null)}
            className="
              absolute right-6 top-6 z-10
              text-3xl font-light text-white
              transition-colors hover:text-[#d4b477]
            "
          >
            ×
          </button>

          <img
            src={selectedImage.image}
            alt={selectedImage.title}
            onClick={(e) => e.stopPropagation()}
            className="
              max-h-[88vh] max-w-[94vw]
              object-contain
            "
          />
        </div>
      )}
    </main>
  );
};

export default Gallery;