import { packageData } from "../Home/SignaturePackages/packageData";
import spaRoom from "../../assets/images/spa-room.jpg";
import sauna from "../../assets/images/sauna.jpg";
import aroma from "../../assets/images/aromatherapyGallary.jpg";

// Reuses the three Home packages and adds a few more for the full page.
const defaultIncludes = {
  1: ["Aromatic massage", "Warm oil ritual", "Finishing tea"],
  2: ["Side-by-side massage", "Private suite", "Sparkling tea"],
  3: ["Massage", "Facial care", "Lounge access"],
};

const base = packageData.map((p) => ({ ...p, includes: defaultIncludes[p.id] }));

const extra = [
  {
    id: 4,
    title: "MORNING RENEWAL",
    subtitle: "BEGIN THE DAY GENTLY",
    image: spaRoom,
    duration: "75 MINUTES",
    price: "₹1,999",
    description:
      "A light morning ritual with a scalp massage, a mineral soak and a warm herbal tea to start the day with ease.",
    includes: ["Scalp massage", "Mineral soak", "Herbal tea"],
  },
  {
    id: 5,
    title: "HEAT & STILLNESS",
    subtitle: "WARMTH FOR THE BODY",
    image: sauna,
    duration: "100 MINUTES",
    price: "₹2,299",
    description:
      "Cedar sauna, steam and a restorative back massage, followed by quiet time in our lounge.",
    includes: ["Cedar sauna", "Back massage", "Lounge access"],
  },
  {
    id: 6,
    title: "AROMATIC EVENING",
    subtitle: "UNWIND AT DUSK",
    image: aroma,
    duration: "90 MINUTES",
    price: "₹2,699",
    description:
      "A candle-lit evening of blended essential oils, a slow full-body massage and a calming tea ceremony.",
    includes: ["Oil blend", "Full-body massage", "Tea ceremony"],
  },
];

export const allPackages = [...base, ...extra];

export const inclusions = [
  "Welcome tisane on arrival",
  "Private treatment room",
  "Fresh robes and slippers",
  "Complimentary lounge time",
];
