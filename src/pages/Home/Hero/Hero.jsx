import { Link } from 'react-router-dom';
import heroMobile from '../../../assets/images/hero/hero-mobile.webp';
import heroTablet from '../../../assets/images/hero/hero-tablet.webp';
import heroDesktop from '../../../assets/images/hero/hero-desktop.webp';

/*
 * Single full-bleed hero. Replaces the pale three-slide carousel (light flat-lay
 * photos under a white overlay) with one warm, candlelit treatment-room photograph.
 *
 * - Mobile gets a portrait crop (828x1472) so the guest's face is the focal point.
 * - Tablet/desktop get wide crops. width/height are declared and the section has a
 *   CSS min-height, so nothing shifts while the image loads.
 * - `svh` keeps the hero inside the visible area when mobile browser bars are showing.
 */
export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#24150c] text-white md:min-h-[min(100svh,860px)]"
    >
      <picture>
        <source media="(max-width: 767px)" srcSet={heroMobile} />
        <source media="(max-width: 1279px)" srcSet={heroTablet} />
        <img
          src={heroDesktop}
          alt="A guest resting on a massage table in a candlelit Aviana treatment room"
          width="1920"
          height="1080"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[55%_30%] md:object-[40%_35%]"
        />
      </picture>

      {/* Readability: darker at the bottom (copy) and a light veil at the top (navbar). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgba(28,17,10,0.92) 0%, rgba(28,17,10,0.55) 38%, rgba(28,17,10,0.12) 62%, rgba(28,17,10,0.45) 100%)',
        }}
      />

      <div className="relative w-full px-6 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] pt-32 md:px-10 md:pb-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-[#e3c996]">Aviana Spa &amp; Beauty Center, Jaipur</p>
            <h1
              id="hero-heading"
              className="mt-3 font-serif text-[2.15rem] font-medium leading-[1.12] sm:text-5xl lg:text-6xl"
            >
              Rejuvenate body, mind and soul.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
              Luxury organic treatments and serene spa rituals. Visit our sanctuary, or let a therapist bring the
              ritual to your home.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/booking?new=1"
                className="inline-flex min-h-12 items-center justify-center bg-[#b08d57] px-8 text-xs font-semibold tracking-[0.18em] text-[#1f150d] transition-colors duration-300 hover:bg-[#c9a468] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                BOOK YOUR TREATMENT
              </Link>
              <Link
                to="/services"
                className="inline-flex min-h-12 items-center justify-center border border-white/70 px-8 text-xs font-semibold tracking-[0.18em] text-white transition-colors duration-300 hover:bg-white hover:text-[#1f150d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                EXPLORE SERVICES
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
