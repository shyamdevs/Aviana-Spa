import Reveal from "../shared/Reveal";
import Label from "../shared/Label";
import Lotus from "../shared/Lotus";
import Ornament from "../shared/Ornament";

export default function Philosophy() {
  return (
    <section className="bg-[#f8f5ef] px-6 py-28 md:py-40 lg:py-48">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal duration={1.6}>
          <div className="mb-10 flex justify-center">
            <Lotus className="h-8 w-10" />
          </div>
          <Label>Our Philosophy</Label>
        </Reveal>

        <Reveal
          as="h2"
          delay={0.3}
          duration={1.8}
          className="mt-10 font-display text-3xl font-normal leading-[1.5] tracking-[0.04em] text-[#171512] sm:text-4xl lg:text-6xl"
        >
          Wellness is a moment to{" "}
          <span className="italic text-[#8f7042]">return to yourself.</span>
        </Reveal>

        <Reveal delay={0.6} duration={1.6}>
          <Ornament className="my-12" />
          <p className="mx-auto max-w-lg font-body text-sm font-light leading-8 tracking-wide text-[#928E88] sm:text-base">
            We believe true luxury is not excess, but the freedom to pause,
            breathe, and simply be.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
