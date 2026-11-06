import { navItems } from "../Navbar/NavLinks";
import { details, hours } from "../../pages/Contact/contactData";

export const exploreLinks = [
  ...navItems.map((n) => ({
    label: n.name.charAt(0) + n.name.slice(1).toLowerCase(),
    to: n.href,
  })),
  { label: "Book an appointment", to: "/booking?new=1" },
];

export const visit = details;
export const openingHours = hours;
