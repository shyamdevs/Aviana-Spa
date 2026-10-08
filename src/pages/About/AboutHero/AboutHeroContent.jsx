import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import Lotus from "../shared/Lotus";
import Ornament from "../shared/Ornament";

export default function AboutHeroContent() {
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-8 pt-24 text-center">
      <Reveal delay={0.3} duration={1.6}>
        <div className="mb-8 flex justify-center">
          <Lotus className="h-8 w-10" />
        </div>
        <Label light>About Aviana</Label>
      </Reveal>

      <Reveal
        as="h1"
        delay={0.6}
        duration={1.8}
        className="mt-8 font-display text-4xl font-normal leading-[1.25] tracking-[0.08em] text-[#FDFCF9] sm:text-5xl lg:text-7xl"
      >
        A space created for{" "}
        <span className="block italic text-[#E7D9BF] sm:mt-2">restoration</span>
      </Reveal>

      <Reveal delay={1.1} duration={1.6}>
        <Ornament className="my-10" />
        <p className="mx-auto max-w-lg font-body text-sm font-light leading-8 tracking-wide text-[#F1EBDF]/90 sm:text-base">
          Thoughtful rituals, peaceful surroundings, and a slower way to
          reconnect with yourself.
        </p>
      </Reveal>
    </div>
  );
}
