import Navbar from "../../layout/Navbar/Navbar";
import LuxuryFooter from "../../layout/Footer/footer";
import PageHero from "../shared/PageHero";
import PageCTA from "../shared/PageCTA";
import SectionHeading from "../shared/SectionHeading";
import FeaturedPackage from "./FeaturedPackage";
import PackageRow from "./PackageRow";
import Inclusions from "./Inclusions";
import { allPackages } from "./packagesData";
import heroImg from "../../assets/images/relaxation.jpg";

export default function Packages() {
  const featured = allPackages.find((p) => p.id === 3);
  const rest = allPackages.filter((p) => p.id !== 3);

  return (
    <div className="overflow-x-clip bg-[#fdfcf9]">
      <Navbar />
      <PageHero
        eyebrow="Curated For You"
        title="Signature Packages"
        intro="Complete spa journeys, composed so that every moment flows gently into the next."
        image={heroImg}
      />
      <FeaturedPackage item={featured} />

      <section className="px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="The Collection"
            title="Choose your journey"
            text="From a quiet morning to a full day of restoration."
          />
          <div className="mt-16 grid gap-x-16 lg:mt-24 lg:grid-cols-2">
            {rest.map((item, i) => (
              <PackageRow key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      <Inclusions />
      <PageCTA
        title="Gift a moment of calm"
        text="Every package is available as a gift. Speak to our team to arrange one."
      />
      <LuxuryFooter />
    </div>
  );
}
