import { ArrowRight } from "lucide-react";
import { filters } from "./ritualsData";

export default function RitualFilters({ active, onChange }) {
  return (
    <div className="flex flex-col items-start gap-4 md:items-end">
      <a
        href="#rituals"
        className="inline-flex items-center gap-2 border-b border-[#B08D57]/40 pb-1 text-xs uppercase tracking-[0.2em] text-[#B08D57] transition-colors hover:border-[#B08D57] hover:text-[#171512]"
      >
        View All Rituals & Sanctuary Itineraries
        <ArrowRight className="h-4 w-4" />
      </a>

      <div className="flex flex-wrap items-center gap-2 rounded-full bg-[#F5F3EF] p-1.5 shadow-sm">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.16em] transition-all duration-300 ${
              active === f.key
                ? "bg-[#B08D57] text-white shadow-sm"
                : "text-[#928E88] hover:bg-white hover:text-[#171512]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}