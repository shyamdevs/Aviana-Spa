import Navbar from "../../layout/Navbar/Navbar";
import LuxuryFooter from "../../layout/Footer/footer";
import Gallery from "../Home/Gallery/Gallery";
import PageCTA from "../shared/PageCTA";
import GalleryBand from "./GalleryBand";

// The grid + lightbox is the existing Home Gallery component, reused as-is.
export default function GalleryPage() {
  return (
    <div className="overflow-x-clip">
      <Navbar />
      <Gallery />
      <GalleryBand />
      <PageCTA
        title="Come and see for yourself"
        text="Photographs tell only part of the story. Visit us and feel the stillness."
      />
      <LuxuryFooter />
    </div>
  );
}
