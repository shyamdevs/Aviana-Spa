import { motion, useReducedMotion } from "motion/react";

// Slow fade + slight upward reveal. Respects prefers-reduced-motion.
export default function Reveal({
  as = "div",
  delay = 0,
  y = 22,
  duration = 1.2,
  className = "",
  children,
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Tag>
  );
}
