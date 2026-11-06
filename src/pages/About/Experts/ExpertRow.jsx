import Reveal from "../shared/Reveal";

// Typographic team row. Shows a small portrait only when an image is provided.
export default function ExpertRow({ name, role, years, image, index }) {
  return (
    <Reveal
      as="li"
      delay={index * 0.15}
      className="group grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 border-b border-[#B08D57]/30 py-8 sm:grid-cols-[4rem_1fr_auto] sm:gap-x-10 md:py-10"
    >
      <span className="font-display text-sm tracking-[0.3em] text-[#B08D57]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-5">
        {image && <img src={image} alt="" className="h-14 w-14 rounded-full object-cover" />}
        <div>
          <h3 className="font-display text-2xl font-normal tracking-[0.04em] text-[#171512] transition-colors duration-500 group-hover:text-[#8f7042] sm:text-3xl">
            {name}
          </h3>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.3em] text-[#B08D57]">
            {role}
          </p>
        </div>
      </div>
      <p className="col-start-2 font-body text-xs font-light tracking-[0.15em] text-[#928E88] sm:col-start-auto sm:text-right">
        {years} years of experience
      </p>
    </Reveal>
  );
}
