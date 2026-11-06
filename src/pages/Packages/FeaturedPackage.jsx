import Reveal from "../About/shared/Reveal";
import Label from "../About/shared/Label";
import { Link } from "react-router-dom";

// Large full-width feature for the flagship package.
export default function FeaturedPackage({ item }) {
  return (
    <section className="relative overflow-hidden bg-[#1a140e]">
      <img
        src={item.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a140e]/90 via-[#1a140e]/50 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 py-28 sm:px-10 lg:px-12 lg:py-40">
        <div className="max-w-xl">
          <Reveal>
            <Label light>Most Loved</Label>
          </Reveal>
          <Reveal
            as="h2"
            delay={0.15}
            className="mt-6 font-serif text-4xl font-light uppercase tracking-[0.08em] text-[#FDFCF9] sm:text-5xl"
          >
            {item.title}
          </Reveal>
          <Reveal delay={0.3}>
            <div className="my-7 flex items-center gap-4 text-[10px] tracking-[0.25em] text-[#D9C4A4]">
              <span>{item.duration}</span>
              <span className="h-1 w-1 rounded-full bg-[#B08D57]" />
              <span>{item.price}</span>
            </div>
            <p className="text-sm font-light leading-8 text-[#F1EBDF]/85 sm:text-base">
              {item.description}
            </p>
            <Link
              to="/booking?new=1"
              className="mt-10 inline-flex min-h-11 items-center border border-[#B08D57] bg-[#B08D57] px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em] text-white transition-colors duration-500 hover:bg-transparent hover:text-[#D9C4A4]"
            >
              Book this ritual
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
