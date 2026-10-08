import { motion } from "motion/react";

export default function FeatureCard({ number, icon: Icon, title, description, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
      className="group flex flex-col items-center px-4 text-center"
    >
      <div
        className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full
                   border border-[#B08D57]/40 shadow-[0_6px_20px_-8px_rgba(23,21,18,0.15)]
                   transition-all duration-500
                   group-hover:border-[#B08D57] group-hover:bg-[#B08D57]
                   group-hover:shadow-[0_10px_28px_-8px_rgba(176,141,87,0.55)]"
      >
        <Icon
          strokeWidth={1.4}
          className="h-8 w-8 text-[#B08D57] transition-colors duration-500 group-hover:text-[#FDFCF9]"
        />
      </div>

      <span className="mb-2 font-serif text-xs italic tracking-[0.25em] text-[#B08D57]/70">
        {number}
      </span>

      <h3 className="mb-3 text-sm font-semibold tracking-[0.15em] text-[#171512]">
        {title.toUpperCase()}
      </h3>

      <p className="max-w-[260px] text-sm leading-relaxed text-[#928E88]">
        {description}
      </p>
    </motion.div>
  );
}