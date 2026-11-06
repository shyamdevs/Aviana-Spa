import { motion } from "motion/react";

export default function RitualCard({ ritual }) {
  const Icon = ritual.icon;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group flex flex-col overflow-hidden bg-[#F5F3EF] shadow-sm transition-shadow duration-500 hover:shadow-xl"
    >
      <div className="relative h-80 w-full overflow-hidden bg-[#E4E2DE]">
        <img
          src={ritual.image}
          alt={ritual.title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F3EF] via-transparent to-black/20" />
        <span className="absolute left-4 top-4 bg-white/90 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#171512] shadow-sm backdrop-blur-md">
          {ritual.location}
        </span>
        <span className="absolute bottom-4 right-4 bg-[#B08D57] px-3 py-1 text-lg text-white">
          {ritual.price}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#B08D57]">
            <Icon className="h-4 w-4" strokeWidth={1.6} />
            <span>{ritual.duration}</span>
          </div>
          <h3 className="mb-3 font-serif text-2xl leading-tight text-[#171512] transition-colors group-hover:text-[#B08D57]">
            {ritual.title}
          </h3>
          <p className="mb-4 text-sm font-light leading-relaxed text-[#928E88]">
            {ritual.description}
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {ritual.tags.map((tag) => (
              <span key={tag} className="bg-white px-2.5 py-1 text-xs text-[#928E88]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button className="w-full bg-[#B08D57] py-3 text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#171512]">
            Reserve
          </button>
          <button className="w-full bg-white py-3 text-xs uppercase tracking-[0.18em] text-[#171512] transition-colors hover:bg-[#EFEEEA]">
            Protocol
          </button>
        </div>
      </div>
    </motion.article>
  );
}