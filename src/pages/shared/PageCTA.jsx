import Reveal from "../About/shared/Reveal";
import Label from "../About/shared/Label";
import { Link } from "react-router-dom";

// Dark closing band, same tone as the Home concierge block.
export default function PageCTA({
  title = "Reserve your moment of stillness",
  text = "Our team will help you choose the ritual that suits you best.",
  primary = { label: "Book an appointment", href: "/booking?new=1" },
  secondary = { label: "Contact us", href: "/contact" },
}) {
  return (
    <section className="bg-[#171512] px-6 py-24 sm:px-10 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <Label light>Aviana Spa</Label>
        </Reveal>
        <Reveal
          as="h2"
          delay={0.15}
          className="mt-6 font-serif text-3xl font-light uppercase tracking-[0.1em] text-[#FDFCF9] sm:text-4xl lg:text-5xl"
        >
          {title}
        </Reveal>
        <Reveal delay={0.3}>
          <p className="mx-auto mt-6 max-w-md text-sm font-light leading-8 text-[#C9C6C1]">
            {text}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              to={primary.href}
              className="inline-flex min-h-11 items-center border border-[#B08D57] bg-[#B08D57] px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em] text-white transition-colors duration-500 hover:bg-transparent hover:text-[#D9C4A4]"
            >
              {primary.label}
            </Link>
            <Link
              to={secondary.href}
              className="inline-flex min-h-11 items-center border border-white/25 px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em] text-[#FDFCF9] transition-colors duration-500 hover:border-[#D9C4A4] hover:text-[#D9C4A4]"
            >
              {secondary.label}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
