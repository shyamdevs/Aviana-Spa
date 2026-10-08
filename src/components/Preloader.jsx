import { useEffect, useState } from "react";
import { motion } from "motion/react";

const draw = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },

  visible: (i) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        delay: i * 0.18,
        duration: 0.9,
        ease: "easeInOut",
      },
      opacity: {
        delay: i * 0.18,
        duration: 0.15,
      },
    },
  }),
};

export default function LotusPreloader({
  onFinish,
  holdTime = 800,
  color = "#B08D57",
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    /*
      Total drawing time:
      last item delay = 5 × 0.18 = 0.9s
      + duration = 0.9s
      ≈ 1.8s

      Then hold for `holdTime`
    */
    const drawTime = 5 * 180 + 900;

    const timer = setTimeout(() => {
      setLeaving(true);
    }, drawTime + holdTime);

    return () => clearTimeout(timer);
  }, [holdTime]);

  return (
    <motion.div
      className={`
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-white
        ${
          leaving
            ? "pointer-events-none"
            : "pointer-events-auto"
        }
      `}
      initial={{ opacity: 1 }}
      animate={{
        opacity: leaving ? 0 : 1,
      }}
      transition={{
        duration: 0.6,
        ease: "easeInOut",
      }}
      onAnimationComplete={() => {
        if (leaving) {
          onFinish?.();
        }
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 160"
        className="h-20 w-20 md:h-28 md:w-28"
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Base wave */}
        <motion.path
          d="M20 120 C55 145, 145 145, 180 120"
          custom={0}
          variants={draw}
          initial="hidden"
          animate="visible"
        />

        {/* Left petal */}
        <motion.path
          d="M100 115 C70 100, 62 65, 85 40 C95 70, 98 95, 100 115 Z"
          custom={1}
          variants={draw}
          initial="hidden"
          animate="visible"
        />

        {/* Center petal */}
        <motion.path
          d="M100 115 C93 80, 96 40, 100 15 C104 40, 107 80, 100 115 Z"
          custom={2}
          variants={draw}
          initial="hidden"
          animate="visible"
        />

        {/* Right petal */}
        <motion.path
          d="M100 115 C130 100, 138 65, 115 40 C105 70, 102 95, 100 115 Z"
          custom={3}
          variants={draw}
          initial="hidden"
          animate="visible"
        />

        {/* Outer left flourish */}
        <motion.path
          d="M100 115 C60 108, 35 85, 30 55"
          custom={4}
          variants={draw}
          initial="hidden"
          animate="visible"
        />

        {/* Outer right flourish */}
        <motion.path
          d="M100 115 C140 108, 165 85, 170 55"
          custom={5}
          variants={draw}
          initial="hidden"
          animate="visible"
        />
      </svg>
    </motion.div>
  );
}