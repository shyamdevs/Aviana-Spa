import Navbar from "../../layout/Navbar/Navbar";
import LuxuryFooter from "../../layout/Footer/footer";
import AboutHero from "./AboutHero/AboutHero";
import OurStory from "./OurStory/OurStory";
import Philosophy from "./Philosophy/Philosophy";
import Approach from "./Approach/Approach";
import Sanctuary from "./Sanctuary/Sanctuary";
import Values from "./Values/Values";
import Experts from "./Experts/Experts";
import Milestones from "./Milestones/Milestones";
import Testimonial from "./Testimonial/Testimonial";
import AboutCTA from "./AboutCTA/AboutCTA";

export default function About() {
  return (
    <div className="overflow-x-clip font-body">
      {/* solid: hero is dark, so the navbar keeps its light background */}
      <Navbar solid />
      <main>
        <AboutHero />
        <OurStory />
        <Philosophy />
        <Approach />
        <Sanctuary />
        <Values />
        <Experts />
        <Milestones />
        <Testimonial />
        <AboutCTA />
      </main>
      <LuxuryFooter />
    </div>
  );
}
