import React from 'react';

// Data definitions
export const patronData = [
  {
    rating: 5,
    tag: "THERMAL TRAVERTINE",
    quote: "The acoustic silence in the subterranean pool is absolute. It is the only space in modern Europe where my thoughts finally fell quiet.",
    name: "Marcus Vane",
    title: "FOUNDER & VENTURE PARTNER, ZURICH",
    badge: "VERIFIED PATRON"
  },
  {
    rating: 5,
    tag: "APOTHECARY CUSTOM",
    quote: "The custom cold-distilled edelweiss blend formulated specifically for my circadian rhythms was unlike anything experienced at traditional luxury resorts.",
    name: "Dr. Elena Rostova",
    title: "BIOPHYSICIST & WELLNESS RESEARCHER, GENEVA",
    badge: "CIRCADIAN ALIGNMENT"
  },
  {
    rating: 5,
    tag: "432HZ SOUND CHAMBER",
    quote: "The crystal alchemy immersion in Kyoto felt like an emotional rebirth. Aviana doesn't offer spa days; they deliver timeless renewals.",
    name: "Siddharth & Meera K.",
    title: "SANCTUARY RETREAT GUESTS, KYOTO",
    badge: "KYOTO ARASHIYAMA"
  }
];

export const pressMentions = [
  { outlet: "VOGUE", quote: '"Contemporary retreat majesty."' },
  { outlet: "ROBB REPORT", quote: '"Discretion without equal."' },
  { outlet: "ARCHITECTURAL DIGEST", quote: '"Monastic travertine suites."' },
  { outlet: "FT HTSI", quote: '"Quiet luxury perfected."' }
];

// Left main card (Spotlight component)
export function CuratorSpotlight() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#eae5dc] flex flex-col justify-between space-y-8 h-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between text-[11px] tracking-wider uppercase font-medium">
          <span className="bg-[#f0ece3] text-[#6e6355] px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b88e58]"></span> CURATOR'S SPOTLIGHT
          </span>
          <span className="text-[#8c8275]">PARIS VENDÔME</span>
        </div>
        <blockquote className="text-xl md:text-2xl font-serif text-[#1c1a17] leading-relaxed">
          "Stepping into Aviana is like leaving the temporal world behind. The subterranean travertine chambers and bespoke Frankincense formulations dissolved months of executive fatigue in ninety transcendent minutes."
        </blockquote>
        <div className="bg-[#f7f4ee] px-3.5 py-2 rounded-lg text-xs text-[#706456] flex items-center gap-2">
          <span className="text-[#b88e58]">★</span>
          <span>Prescription: 3-Hour Obsidian & Rare Rose Bodywork</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#f0ece3] pt-6">
        <div>
          <h4 className="font-semibold text-sm text-[#1c1a17]">Lady Genevieve Vance-Harrow</h4>
          <p className="text-[11px] tracking-wider text-[#8c8275] uppercase mt-0.5">ART PATRON & COLLECTOR • LONDON & PARIS</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#f0ece3] text-[#8a7258] flex items-center justify-center font-serif text-xs font-semibold">
          GV
        </div>
      </div>
    </div>
  );
}

// Right column individual review card
export function PatronCard({ patron }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#eae5dc] flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[#b88e58] text-xs">{"★".repeat(patron.rating)}</div>
        <span className="text-[10px] tracking-widest uppercase font-semibold text-[#8c8275] bg-[#f7f4ee] px-2.5 py-1 rounded">
          {patron.tag}
        </span>
      </div>
      <p className="text-sm md:text-base font-serif text-[#2c2824] leading-relaxed">"{patron.quote}"</p>
      <div className="flex items-end justify-between border-t border-[#f7f4ee] pt-3">
        <div>
          <h5 className="font-semibold text-xs text-[#1c1a17]">{patron.name}</h5>
          <p className="text-[10px] tracking-wider text-[#8c8275] uppercase mt-0.5">{patron.title}</p>
        </div>
        <span className="text-[10px] tracking-widest text-[#a39788] uppercase font-medium">{patron.badge}</span>
      </div>
    </div>
  );
}