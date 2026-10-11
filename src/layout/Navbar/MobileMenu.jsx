import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '../../hooks/useAuth';
import { navItems } from "./NavLinks";

const MobileMenu = ({ isOpen, setIsOpen }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close with the Escape key.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setIsOpen]);

  return (
    <div
      id="mobile-menu"
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[60] overflow-y-auto overscroll-contain md:hidden bg-[#fcf8f5] transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        isOpen ? "translate-x-0 opacity-100 visible" : "translate-x-full opacity-0 invisible"
      }`}
    >
      <div className="flex min-h-[100dvh] flex-col px-7 pt-24 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <nav className="flex flex-1 items-center justify-center py-6" aria-label="Mobile">
          <ul className="flex flex-col items-center gap-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center text-[13px] font-medium tracking-[0.25em] transition-colors duration-300 ${
                      active ? "text-[#B08D57]" : "text-[#38342f] hover:text-[#B08D57]"
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mb-6 flex justify-center gap-5">
          {user ? <><Link to="/dashboard" onClick={() => setIsOpen(false)} className="inline-flex min-h-11 items-center px-2 text-[11px] tracking-[0.18em] text-[#6d655a]">ACCOUNT</Link><button type="button" onClick={() => { setIsOpen(false); logout(); }} className="inline-flex min-h-11 items-center px-2 text-[11px] tracking-[0.18em] text-[#6d655a]">LOG OUT</button></> : <Link to="/login" onClick={() => setIsOpen(false)} className="inline-flex min-h-11 items-center px-2 text-[11px] tracking-[0.18em] text-[#6d655a]">SIGN IN</Link>}
        </div>

        <div className="flex justify-center">
          <Link
            to="/booking?new=1"
            onClick={() => setIsOpen(false)}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center border border-[#B08D57] bg-[#B08D57] px-8 text-[11px] font-semibold tracking-[0.2em] text-[#1f150d] transition-all duration-300 hover:bg-transparent hover:text-[#8d6a39]"
          >
            BOOK AN APPOINTMENT
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
