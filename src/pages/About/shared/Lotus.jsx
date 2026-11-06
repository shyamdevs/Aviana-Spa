// Small line-art lotus, same mark family as the homepage preloader.
export default function Lotus({ className = "h-8 w-10" }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={className}
      fill="none"
      stroke="#B08D57"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M20 120 C55 145, 145 145, 180 120" />
      <path d="M100 115 C70 100, 62 65, 85 40 C95 70, 98 95, 100 115 Z" />
      <path d="M100 115 C93 80, 96 40, 100 15 C104 40, 107 80, 100 115 Z" />
      <path d="M100 115 C130 100, 138 65, 115 40 C105 70, 102 95, 100 115 Z" />
      <path d="M100 115 C60 108, 35 85, 30 55" />
      <path d="M100 115 C140 108, 165 85, 170 55" />
    </svg>
  );
}
