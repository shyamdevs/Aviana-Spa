// Minimal gold line-art marks, one per value key.
const shapes = {
  presence: (
    <>
      <circle cx="24" cy="24" r="17" />
      <circle cx="24" cy="24" r="8" />
      <circle cx="24" cy="24" r="1" fill="#B08D57" />
    </>
  ),
  craft: (
    <>
      <path d="M24 5 L43 24 L24 43 L5 24 Z" />
      <path d="M24 5 V43 M5 24 H43" />
    </>
  ),
  balance: (
    <>
      <circle cx="18" cy="24" r="13" />
      <circle cx="30" cy="24" r="13" />
    </>
  ),
  care: (
    <>
      <path d="M24 42 C10 34 10 16 24 6 C38 16 38 34 24 42 Z" />
      <path d="M24 42 V16" />
    </>
  ),
};

export default function ValueIcon({ name }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-11 w-11"
      fill="none"
      stroke="#B08D57"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}
