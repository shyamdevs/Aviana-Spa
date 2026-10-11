import Navbar from "../../layout/Navbar/Navbar";
import LuxuryFooter from "../../layout/Footer/footer";
import SectionHeading from "../shared/SectionHeading";
import BookingForm from "./BookingForm";
import img from "../../assets/images/spa-room.jpg";

export default function Booking() {
  return (
    <div className="overflow-x-clip bg-[#fdfcf9]">
      <Navbar />
      <section className="px-6 pb-24 pt-36 sm:px-10 lg:px-12 lg:pb-32 lg:pt-44">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <SectionHeading
              align="left"
              eyebrow="Reservations"
              title="Book an appointment"
              text="Tell us when you would like to visit and we will confirm your booking personally."
            />
            <div className="mt-12 hidden aspect-[4/5] overflow-hidden lg:block">
              <img src={img} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="lg:col-span-7 lg:pt-6">
            <BookingForm />
          </div>
        </div>
      </section>
      <LuxuryFooter />
    </div>
  );
}
