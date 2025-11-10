import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AppointmentSection from "@/components/AppointmentSection";
import DocumentUploadSection from "@/components/DocumentUploadSection";
import HelpSection from "@/components/HelpSection";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";

const Index = () => {
  return (
    <div className="relative">
      <ProfileCompletionDialog />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AppointmentSection />
        <DocumentUploadSection />
        <HelpSection />
      </main>
    </div>
  );
};

export default Index;
