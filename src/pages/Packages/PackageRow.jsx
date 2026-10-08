import Reveal from "../About/shared/Reveal";
import { Link } from "react-router-dom";

// Compact editorial row: small image, details and price in a thin-ruled list.
export default function PackageRow({ item, index }) {
  return (
    <Reveal
      as="article"
      delay={(index % 2) * 0.1}
      className="group grid gap-6 border-t border-[#B08D57]/30 py-10 sm:grid-cols-[180px_1fr] sm:gap-8 lg:py-12"
    >
      <div className="aspect-[4/3] overflow-hidden sm:aspect-square">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col justify-between">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-[#a98a5b]">
            {item.subtitle}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <h3 className="font-serif text-2xl font-light tracking-[0.06em] text-[#171512] transition-colors duration-300 group-hover:text-[#B08D57]">
              {item.title}
            </h3>
            <span className="shrink-0 text-sm tracking-wide text-[#8f7042]">
              {item.price}
            </span>
          </div>
          <p className="mt-3 text-sm font-light leading-7 text-[#918b84]">
            {item.description}
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#a98a5b]">
            {item.duration} · {item.includes.join(" · ")}
          </p>
        </div>
        <Link
          to="/booking?new=1"
          className="mt-6 inline-flex min-h-11 items-center gap-3 self-start border-b border-[#b08d57] pb-1 text-[10px] font-medium uppercase tracking-[0.24em] text-[#8f7042] transition-colors duration-300 hover:text-[#b08d57]"
        >
          Book <span className="text-sm">→</span>
        </Link>
      </div>
    </Reveal>
  );
}
