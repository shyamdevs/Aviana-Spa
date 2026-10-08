import { Link, useLocation } from "react-router-dom";

export const navItems = [
  { name: "HOME", href: "/" },
  { name: "ABOUT", href: "/about" },
  { name: "SERVICES", href: "/services" },
  { name: "THERAPISTS", href: "/therapists" },
  { name: "PACKAGES", href: "/packages" },
  { name: "GALLERY", href: "/gallery" },
  { name: "CONTACT", href: "/contact" },
];

const NavLinks = () => {
  const { pathname } = useLocation();

  return (
    <ul className="hidden md:flex items-center gap-7 lg:gap-9">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <li key={item.name} className="relative group py-2">
            <Link
              to={item.href}
              aria-current={active ? "page" : undefined}
              className={`text-[11px] font-medium tracking-[0.2em] transition-colors duration-300 ${
                active ? "text-[#B08D57]" : "text-[#4a4a4a] hover:text-[#B08D57]"
              }`}
            >
              {item.name}
            </Link>
            <span
              className={`absolute left-0 bottom-0 h-[1px] bg-[#B08D57] transition-all duration-300 ${
                active ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </li>
        );
      })}
    </ul>
  );
};

export default NavLinks;
