import Reveal from "../About/shared/Reveal";
import Label from "../About/shared/Label";

export default function SectionHeading({
  eyebrow,
  title,
  text,
  align = "center",
  light = false,
}) {
  const center = align === "center";
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <Reveal>
        <Label light={light}>{eyebrow}</Label>
      </Reveal>
      <Reveal
        as="h2"
        delay={0.15}
        className={`mt-5 font-serif text-3xl font-light uppercase tracking-[0.08em] sm:text-4xl lg:text-5xl ${
          light ? "text-[#FDFCF9]" : "text-[#171512]"
        }`}
      >
        {title}
      </Reveal>
      {text && (
        <Reveal delay={0.3}>
          <p
            className={`mt-6 text-sm font-light leading-8 sm:text-base ${
              light ? "text-[#F1EBDF]/85" : "text-[#918b84]"
            }`}
          >
            {text}
          </p>
        </Reveal>
      )}
    </div>
  );
}
