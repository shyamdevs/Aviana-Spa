import Reveal from "../About/shared/Reveal";
import SectionHeading from "../shared/SectionHeading";

const steps = [
  { title: "Arrive", text: "A cool towel, a warm tisane and a moment to settle in." },
  { title: "Consult", text: "A short conversation so your therapist can tailor the ritual." },
  { title: "Restore", text: "Your treatment, in a quiet room, at an unhurried pace." },
  { title: "Linger", text: "Rest in our lounge for as long as you like afterwards." },
];

export default function VisitSteps() { return <section className="bg-[#f6f2ec] px-6 py-24 sm:px-10 lg:px-12 lg:py-32"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Your Visit" title="An unhurried journey" text="Every visit follows a gentle rhythm, so you can leave the day behind."/><ol className="relative mt-20 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"><span className="absolute left-0 right-0 top-[18px] hidden h-px bg-[#B08D57]/30 lg:block"/>{steps.map((step,index)=><Reveal as="li" key={step.title} delay={index*.12} className="relative text-center lg:text-left"><span className="relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#B08D57] bg-[#f6f2ec] text-[11px] tracking-widest text-[#8f7042] lg:mx-0">{index+1}</span><h3 className="mt-6 font-serif text-2xl font-light uppercase tracking-[0.1em] text-[#171512]">{step.title}</h3><p className="mx-auto mt-3 max-w-[260px] text-sm font-light leading-7 text-[#918b84] lg:mx-0">{step.text}</p></Reveal>)}</ol></div></section>; }
