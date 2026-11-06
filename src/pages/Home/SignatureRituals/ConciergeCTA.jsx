import { BadgeCheck, Phone, ArrowRight } from "lucide-react";

export default function ConciergeCTA() {
  return (
    <div className="relative overflow-hidden bg-[#171512] p-10 text-[#FDFCF9] shadow-xl lg:p-14">
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#B08D57]/10 blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
        <div className="max-w-2xl space-y-2 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#D9C4A4]">
            <BadgeCheck className="h-4 w-4" />
            Private Bespoke Curation
          </div>
          <h3 className="font-serif text-3xl text-[#FDFCF9]">
            Design a Non-Linear{" "}
            <span className="italic text-[#D9C4A4]">Sanctuary Stay</span>
          </h3>
          <p className="font-light text-[#C9C6C1]">
            Personalized herbal decoctions, private thermal chamber sequestering, and
            multi-day restorative itineraries tailored exclusively to your diary.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row">
          <a
            href="tel:+33140205000"
            className="flex items-center gap-2 border border-white/20 px-6 py-3.5 text-xs uppercase tracking-[0.18em] text-[#FDFCF9] transition-colors hover:border-[#D9C4A4] hover:text-[#D9C4A4]"
          >
            <Phone className="h-4 w-4" />
            +33 (0)1 40 20 50 00
          </a>
          <button className="flex items-center gap-2 bg-[#B08D57] px-8 py-3.5 text-xs uppercase tracking-[0.2em] text-white shadow-md transition-all duration-300 hover:bg-[#C9A66B]">
            Consult Sanctuary Concierge
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}