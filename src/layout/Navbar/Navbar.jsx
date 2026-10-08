import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import MobileMenu from "./MobileMenu";
import { useAuth } from "../../hooks/useAuth";

const Navbar = ({ solid = false }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      {/* Navbar */}
      <header
        className={`
          fixed
          top-0
          left-0
          z-[100]
          w-full
          transition-all
          duration-500
          ${
            solid || scrolled || mobileOpen
              ? "bg-white/95 py-4 shadow-sm backdrop-blur-md"
              : "bg-transparent py-6"
          }
        `}
      >
        <div
          className="
            mx-auto
            flex
            max-w-7xl
            items-center
            justify-between
            px-6
            md:px-10
            lg:px-12
          "
        >
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <NavLinks />

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3">

            {user ? (
              <div className="hidden items-center gap-3 md:flex">
                <Link to="/dashboard" className="text-[10px] font-medium tracking-[0.18em] text-[#6d655a] hover:text-[#b08d57]">ACCOUNT</Link>
                <button type="button" onClick={logout} className="text-[10px] font-medium tracking-[0.18em] text-[#6d655a] hover:text-[#b08d57]">LOG OUT</button>
              </div>
            ) : (
              <Link to="/login" className="hidden text-[10px] font-medium tracking-[0.18em] text-[#6d655a] hover:text-[#b08d57] md:inline-flex">SIGN IN</Link>
            )}

            {/* Desktop Book Button */}
            <Link
              to="/booking?new=1"
              className="
                hidden
                border
                border-[#c29d59]
                bg-[#c29d59]
                px-5
                py-2.5
                text-[10px]
                font-medium
                tracking-[0.18em]
                text-white
                transition-all
                duration-300
                hover:bg-transparent
                hover:text-[#c29d59]
                md:inline-flex
                lg:px-6
              "
            >
              BOOK NOW
            </Link>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={
                mobileOpen ? "Close navigation" : "Open navigation"
              }
              aria-expanded={mobileOpen}
              className="relative z-[110] flex h-10  w-10 items-center justify-center text-gray-800 transition-colors duration-300 hover:text-[#c29d59] md:hidden "
            >
              {mobileOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                    d="M6 6l12 12M18 6 6 18"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                    d="M4 7h16M4 12h16M4 17h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu - outside header */}
      <MobileMenu
        isOpen={mobileOpen}
        setIsOpen={setMobileOpen}
      />
    </>
  );
};

export default Navbar;