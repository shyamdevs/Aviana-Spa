import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

// Counts up to values like "25K+", "10+" or "4.9" when scrolled into view.
export default function CountUp({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  const match = /^([\d.]+)(.*)$/.exec(value);
  const target = match ? parseFloat(match[1]) : null;
  const decimals = match && match[1].includes(".") ? match[1].split(".")[1].length : 0;
  const suffix = match ? match[2] : "";

  const [n, setN] = useState(reduce ? target : 0);

  useEffect(() => {
    if (!inView || reduce || target === null) return;
    const controls = animate(0, target, {
      duration: 2.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setN,
    });
    return () => controls.stop();
  }, [inView, reduce, target]);

  if (!match) return <span ref={ref}>{value}</span>;
  return (
    <span ref={ref}>
      {n.toFixed(decimals)}
      {suffix}
    </span>
  );
}
