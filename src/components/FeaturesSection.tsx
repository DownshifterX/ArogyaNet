import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  Calendar,
  MessageSquare,
  FileText,
  Activity,
  Users,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Easy Appointment Booking",
    description:
      "Schedule appointments with top doctors in seconds. Get instant confirmations and reminders.",
  },
  {
    icon: MessageSquare,
    title: "Telemedicine Consultations",
    description:
      "Connect with healthcare professionals remotely through secure video calls and messaging.",
  },
  {
    icon: FileText,
    title: "Digital Health Records",
    description:
      "Access your complete medical history anytime, anywhere. All your health data in one place.",
  },
  {
    icon: Activity,
    title: "Health Score Monitoring",
    description:
      "Track your health metrics and get personalized insights with our AI-powered health score calculator.",
  },
  {
    icon: Users,
    title: "For Doctors & Patients",
    description:
      "A unified platform serving both healthcare providers and patients with specialized features.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant Security",
    description:
      "Your health data is protected with enterprise-grade security and encryption standards.",
  },
];

const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="features"
      className="py-24 px-6 bg-gradient-to-b from-background to-secondary"
    >
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful Features for{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Modern Healthcare
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage your health digitally, all in one
            intuitive platform
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="group relative p-8 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mb-6"
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </motion.div>

                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
