import { salonData } from "../Home/OurSalons/salonData";

// Locations reuse the Home salon data so both pages stay in sync.
export const locations = salonData;

export const details = [
  { label: "Visit", lines: ["198 West 21th Street, Suite 721", "Barcelona 20020"] },
  { label: "Call", lines: ["1-847-555-5555"], href: "tel:+18475555555" },
  { label: "Write", lines: ["aviana@qodeinteractive.com"], href: "mailto:aviana@qodeinteractive.com" },
];

export const hours = [
  { days: "Monday – Friday", time: "9:00 am – 8:00 pm" },
  { days: "Saturday", time: "9:00 am – 9:00 pm" },
  { days: "Sunday", time: "10:00 am – 6:00 pm" },
];
