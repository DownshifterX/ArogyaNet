import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AppointmentSection from "@/components/AppointmentSection";
import HealthRecordsSection from "@/components/HealthRecordsSection";
import HelpSection from "@/components/HelpSection";

const Index = () => {
  return (
    <div className="relative">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AppointmentSection />
        <HealthRecordsSection />
        <HelpSection />
      </main>
    </div>
  );
};

export default Index;