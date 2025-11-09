import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AppointmentSection from "@/components/AppointmentSection";
import HealthScoreSection from "@/components/HealthScoreSection";
import HelpSection from "@/components/HelpSection";

const Index = () => {
  return (
    <div className="relative">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AppointmentSection />
        <HealthScoreSection />
        <HelpSection />
      </main>
    </div>
  );
};

export default Index;