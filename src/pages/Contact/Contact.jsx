import Navbar from "../../layout/Navbar/Navbar";
import LuxuryFooter from "../../layout/Footer/footer";
import PageHero from "../shared/PageHero";
import ContactDetails from "./ContactDetails";
import ContactForm from "./ContactForm";
import Locations from "./Locations";
import heroImg from "../../assets/images/spa-detail.jpg";

export default function Contact() {
  return (
    <div className="overflow-x-clip bg-[#fdfcf9]">
      <Navbar />
      <PageHero
        eyebrow="Get in Touch"
        title="Contact Us"
        intro="Questions, special requests or a treatment to plan? We would love to hear from you."
        image={heroImg}
      />

      <section className="px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <ContactDetails />
          </div>
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      <Locations />
      <LuxuryFooter />
    </div>
  );
}
