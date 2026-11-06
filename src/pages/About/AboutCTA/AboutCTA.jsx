import { Link } from "react-router-dom";
import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import Ornament from "../shared/Ornament";
import bg from "../../../assets/images/relaxation.jpg";

export default function AboutCTA() {
  return (
    <section className="relative overflow-hidden bg-[#1a140e] px-6 py-32 md:py-44">
      <img src={bg} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#1a140e]/70" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <Reveal duration={1.6}>
          <Label light>Begin your ritual</Label>
        </Reveal>
        <Reveal
          as="h2"
          delay={0.2}
          duration={1.6}
          className="mt-7 font-display text-3xl font-normal uppercase tracking-[0.14em] text-[#FDFCF9] sm:text-4xl lg:text-6xl"
        >
          Take time for <span className="italic normal-case text-[#E7D9BF]">you</span>
        </Reveal>

        <Reveal delay={0.4} duration={1.6}>
          <Ornament className="my-10" />
          <p className="font-body text-sm font-light leading-7 tracking-wide text-[#F1EBDF]/90 sm:text-base">
            Your next moment of stillness is waiting.
          </p>
          <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              to="/booking?new=1"
              className="inline-flex min-h-11 items-center border border-[#B08D57] bg-[#B08D57] px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em] text-white transition-colors duration-500 hover:bg-transparent hover:text-[#E7D9BF]"
            >
              Book an appointment
            </Link>
            <Link
              to="/services"
              className="inline-flex min-h-11 items-center border border-white/30 px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em] text-[#FDFCF9] transition-colors duration-500 hover:border-[#E7D9BF] hover:text-[#E7D9BF]"
            >
              Explore treatments
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
