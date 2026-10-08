import { useState } from "react";

export default function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  // No backend yet: hook your newsletter API in here.
  const onSubmit = (e) => {
    e.preventDefault();
    setDone(true);
    setEmail("");
  };

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-[#B08D57]">
        The Aviana Letter
      </p>
      <h2 className="mt-4 font-serif text-3xl font-light leading-snug text-[#171512] sm:text-4xl">
        Seasonal rituals, <span className="italic text-[#8f7042]">delivered gently</span>
      </h2>
      <p className="mt-4 max-w-md text-sm font-light leading-7 text-[#777068]">
        Occasional letters about new treatments, seasonal offers and quiet
        moments. Never more than once a month.
      </p>

      {done ? (
        <p role="status" className="mt-8 font-serif text-lg italic text-[#8f7042]">
          Thank you. Your first letter is on its way.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-4 sm:flex-row">
          <label htmlFor="footer-email" className="sr-only">Email address</label>
          <input
            id="footer-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="min-h-12 flex-1 border-0 border-b border-[#B08D57]/50 bg-transparent px-0 text-sm font-light text-[#171512] placeholder-[#a8a29a] focus:border-[#B08D57] focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-12 border border-[#B08D57] bg-[#B08D57] px-8 text-[10px] font-medium uppercase tracking-[0.25em] text-white transition-colors duration-500 hover:bg-transparent hover:text-[#8f7042]"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
