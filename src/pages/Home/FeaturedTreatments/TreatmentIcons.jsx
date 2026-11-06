import React from "react";

const props = {
  viewBox: "0 0 80 80",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-14 w-14",
};

export const EnergyIcon = () => (
  <svg {...props}>
    <circle cx="40" cy="39" r="11" />
    <path d="M40 19V12" />
    <path d="M40 66V59" />
    <path d="M20 39H13" />
    <path d="M67 39H60" />
    <path d="M26 25L21 20" />
    <path d="M54 53L59 58" />
    <path d="M54 25L59 20" />
    <path d="M26 53L21 58" />
    <path d="M40 33C36 38 36 43 40 48" />
    <path d="M40 33C44 38 44 43 40 48" />
    <path d="M31 55C36 58 44 58 49 55" />
  </svg>
);

export const MassageIcon = () => (
  <svg {...props}>
    <path d="M20 43C25 33 34 29 41 33" />
    <path d="M60 43C55 33 46 29 39 33" />
    <path d="M25 43C29 38 34 36 39 39" />
    <path d="M55 43C51 38 46 36 41 39" />
    <path d="M31 47C34 44 36 43 39 45" />
    <path d="M49 47C46 44 44 43 41 45" />
    <path d="M22 50C28 57 34 60 40 60C46 60 52 57 58 50" />
    <path d="M28 27C27 22 30 18 34 17" />
    <path d="M52 27C53 22 50 18 46 17" />
    <path d="M34 17C36 14 39 14 40 17" />
    <path d="M46 17C44 14 41 14 40 17" />
  </svg>
);

export const MindIcon = () => (
  <svg {...props}>
    <path d="M40 60V52" />
    <path d="M40 52C31 52 25 46 25 37C25 28 31 22 40 22C49 22 55 28 55 37C55 46 49 52 40 52Z" />
    <path d="M34 36C32 34 33 30 36 29C38 29 39 30 40 32" />
    <path d="M46 36C48 34 47 30 44 29C42 29 41 30 40 32" />
    <path d="M34 40C37 43 43 43 46 40" />
    <path d="M40 22C40 18 37 15 34 14" />
    <path d="M40 22C40 18 43 15 46 14" />
    <path d="M31 57C34 54 37 54 40 57C43 54 46 54 49 57" />
    <path d="M27 63H53" />
  </svg>
);

export const RelaxationIcon = () => (
  <svg {...props}>
    <path d="M22 42H58" />
    <path d="M25 42C26 51 32 56 40 56C48 56 54 51 55 42" />
    <path d="M30 47C34 50 46 50 50 47" />
    <path d="M31 31C28 27 30 23 33 21" />
    <path d="M40 31C37 26 39 21 42 18" />
    <path d="M49 31C52 27 50 23 47 21" />
    <path d="M33 21C36 18 39 19 40 22" />
    <path d="M42 18C45 16 47 18 47 21" />
    <path d="M19 61C25 58 31 58 36 61" />
    <path d="M44 61C49 58 55 58 61 61" />
    <path d="M28 66C36 63 44 63 52 66" />
  </svg>
);