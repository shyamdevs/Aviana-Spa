import React, { useState } from 'react'
import LotusPreloader from '../../components/Preloader'
import Navbar from '../../layout/Navbar/Navbar'
import HeroSlider from './HeroSlider/HeroSlider'
import WelcomeSection from './WelcomeMessage/WelcomeSection';
import FeaturedTreatments from './FeaturedTreatments/FeaturedTreatments';
import SpaExperience from './spaExperience/SpaExperience';
import WellnessPanels from './WellnessPanels/WellnessPanels';
import SignaturePackages from './SignaturePackages/SignaturePackages';
import WhyChooseUs from './WhyChooseUs/WhyChooseUs';
import VoicesOfRestorationPage from './Testimonials/VoicesOfRestorationPage';
import SignatureRituals from './SignatureRituals/SignatureRituals';
import Gallery from './Gallery/Gallery';
import OurSalons from './OurSalons/OurSalons';
import LuxuryFooter from '../../layout/Footer/footer';

export default function Home() {
    const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem("aviana-preloaded");
    } catch {
      return true;
    }
  });

  const finishLoading = () => {
    try {
      sessionStorage.setItem("aviana-preloaded", "1");
    } catch {
      /* storage unavailable */
    }
    setLoading(false);
  };

  return (
    <>
     {loading && (
        <LotusPreloader
          onFinish={finishLoading}
        />
      )}

    <Navbar/>
    <HeroSlider/>
    <WelcomeSection/>
    <FeaturedTreatments/>
    <SpaExperience/>
    <WellnessPanels/>
    <SignaturePackages/>
    <WhyChooseUs/>
    <VoicesOfRestorationPage/>
    <SignatureRituals   />
    <Gallery/>
    <OurSalons/>
    <LuxuryFooter/>

    </>
  )
}
