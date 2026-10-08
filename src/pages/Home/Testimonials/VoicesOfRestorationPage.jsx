import React from 'react';
import { patronData, pressMentions, CuratorSpotlight, PatronCard } from './patronData';

export default function VoicesOfRestorationPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f0] text-[#1c1a17] font-sans p-6 md:p-12 lg:p-16 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#e2ddd4] pb-8">
          <div>
            <span className="text-xs tracking-[0.25em] uppercase text-[#8c8275] font-medium block mb-2">
              — VOICES OF RESTORATION
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#1c1a17] leading-tight">
              Echoes of Stillness from <br className="hidden md:block" />
              <span className="italic font-normal text-[#8a7258]">Our Cherished Patrons</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="bg-[#ede8df] px-4 py-2.5 rounded-xl flex items-center gap-3">
              <div className="flex text-[#b88e58] text-xs">★★★★★</div>
              <div className="text-[11px] leading-tight text-[#5a5349]">
                <strong className="block text-[#1c1a17] font-semibold">99.4% Curated</strong>
                GUEST SATISFACTION
              </div>
            </div>
            <a href="/about" className="text-xs uppercase tracking-widest font-semibold text-[#1c1a17] hover:text-[#b88e58] transition-colors flex items-center gap-1">
              READ ALL CHRONICLES <span className="text-sm">→</span>
            </a>
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5">
            <CuratorSpotlight />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-4">
            {patronData.map((patron, idx) => (
              <PatronCard key={idx} patron={patron} />
            ))}
          </div>
        </main>

        {/* Press Quotes Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-[#e2ddd4]">
          {pressMentions.map((press, idx) => (
            <div key={idx} className="text-center space-y-1">
              <h6 className="text-xs font-bold tracking-widest text-[#1c1a17] uppercase">{press.outlet}</h6>
              <p className="text-[11px] font-serif italic text-[#786e62]">{press.quote}</p>
            </div>
          ))}
        </section>

        {/* Bottom CTA Banner */}
        <footer className="bg-[#1c1a17] text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg md:text-xl font-serif text-white">Experience Transcendent Stillness</h3>
            <p className="text-xs text-[#a39b8e] mt-1">
              Consult with a private sanctuary concierge for tailored restorative itineraries.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none bg-[#c89d66] hover:bg-[#b58b55] text-[#1c1a17] text-xs font-bold tracking-wider uppercase px-5 py-3 rounded-lg transition-colors">
              RESERVE TREATMENT
            </button>
            <button className="flex-1 md:flex-none border border-white/20 hover:bg-white/10 text-white text-xs font-bold tracking-wider uppercase px-5 py-3 rounded-lg transition-colors">
              READ FULL ANTHOLOGY
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}