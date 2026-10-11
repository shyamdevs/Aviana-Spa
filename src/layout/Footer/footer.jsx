import { Link } from "react-router-dom";
import logo from "../../assets/images/logo-default.png";
import FooterNewsletter from "./FooterNewsletter";
import { exploreLinks, visit, openingHours } from "./footerData";

const heading = "text-[10px] font-medium uppercase tracking-[0.35em] text-[#B08D57]";
const linkCls = "transition-colors duration-300 hover:text-[#B08D57]";

export default function LuxuryFooter() {
  return (
    <footer className="border-t border-[#B08D57]/25 bg-[#f6f4ee] px-6 pt-20 sm:px-10 lg:px-12 lg:pt-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-16 border-b border-[#B08D57]/25 pb-16 lg:grid-cols-2 lg:gap-24">
          <FooterNewsletter />
          <div className="flex items-end lg:justify-end">
            <Link to="/booking?new=1" className="group inline-flex min-h-11 items-center gap-4 border-b border-[#B08D57] pb-2 font-serif text-2xl font-light text-[#171512] transition-colors hover:text-[#8f7042] sm:text-3xl">
              Reserve your moment of calm
              <span className="transition-transform duration-500 group-hover:translate-x-2">→</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" aria-label="Aviana Spa Home">
              <img src={logo} alt="Aviana Spa" className="h-10 w-auto" />
            </Link>
            <p className="mt-6 max-w-[16rem] text-sm font-light leading-7 text-[#777068]">
              A place to pause, breathe and return to yourself.
            </p>
          </div>

          <nav aria-label="Footer">
            <h3 className={heading}>Explore</h3>
            <ul className="mt-6 space-y-3 text-sm font-light text-[#4a4a4a]">
              {exploreLinks.map((l) => (
                <li key={l.to}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className={heading}>Visit</h3>
            <ul className="mt-6 space-y-4 text-sm font-light leading-7 text-[#4a4a4a]">
              {visit.map((d) => (
                <li key={d.label}>
                  {d.href ? (
                    <a href={d.href} className={linkCls}>{d.lines[0]}</a>
                  ) : (
                    d.lines.map((l) => <p key={l}>{l}</p>)
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={heading}>Hours</h3>
            <ul className="mt-6 space-y-3 text-sm font-light text-[#4a4a4a]">
              {openingHours.map((h) => (
                <li key={h.days}>
                  <span className="block">{h.days}</span>
                  <span className="text-[#8f7042]">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#B08D57]/25 py-8 text-center text-[10px] uppercase tracking-[0.25em] text-[#928E88] sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Aviana Spa. All rights reserved.</p>
          <p>Crafted with care</p>
        </div>
      </div>
    </footer>
  );
}
