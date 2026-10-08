import { Hourglass, AudioLines, Sparkle } from "lucide-react";
import obsidian from "../../../assets/images/obsidian.png"
import hydro from "../../../assets/images/hydro.png"
import circadian from "../../../assets/images/circadian.png"



export const rituals = [
  {
    id: "obsidian-rose",
    category: ["obsidian"],
    location: "Paris Sanctuary • Vendôme",
    price: "€680",
    duration: "180 Minutes • 1:1 Master Healer",
    icon: Hourglass,
    title: "The 3-Hour Obsidian & Rare Rose Bodywork",
    description:
      "Cold-distilled Bulgarian Damask rose absolute harmonized with warm volcanic obsidian basalt. An exhaustive head-to-sole lymphatic draining contour releasing profound cellular trauma.",
    tags: ["Damask Rose Absolute", "Volcanic Obsidian", "Deep Lymphatic Flow"],
    image: obsidian,
  },
  {
    id: "hydro-sound",
    category: ["hydro", "sound"],
    location: "Kyoto Sanctuary • Arashiyama",
    price: "€540",
    duration: "120 Minutes • Private Thermal Chamber",
    icon: AudioLines,
    title: "Travertine Hydrothermal & 432Hz Sound Immersion",
    description:
      "Weightless subterranean salt suspension paired with resonant Tibetan bronze singing bowls calibrated precisely to 432Hz, dissolving sensory fatigue and resetting vagal tone.",
    tags: ["Monastic Cedar Steam", "432Hz Sound Chamber", "Okinawa Sea Salts"],
    image: hydro,
  },
  {
    id: "circadian-edelweiss",
    category: ["circadian"],
    location: "Aspen Sanctuary • Highlands",
    price: "€620",
    duration: "150 Minutes • Chronobiologist Guided",
    icon: Sparkle,
    title: "Circadian Edelweiss & Alpine Cellular Reset",
    description:
      "Bio-active Valais edelweiss stem cells fused with localized cryo-thermal facial sculpting. Synchronizes metabolic receptors to alpine elevation for restored sleep depth.",
    tags: ["Valais Edelweiss Elixir", "Cryo Sculpting", "Delta-Wave Light Bed"],
    image: circadian,
  },
];

export const filters = [
  { key: "all", label: "All Rituals" },
  { key: "hydro", label: "Hydrotherapy" },
  { key: "obsidian", label: "Obsidian" },
  { key: "circadian", label: "Circadian" },
  { key: "sound", label: "Acoustic" },
];