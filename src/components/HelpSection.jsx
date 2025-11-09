import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageCircle, Phone, Mail } from "lucide-react";

const HelpSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const helpOptions = [
    {
      icon: MessageCircle,
      title: "Live Chat Support",
      description: "Chat with our support team in real-time",
      action: "Start Chat",
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Call us for immediate assistance",
      action: "Call Now",
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us your queries via email",
      action: "Send Email",
    },
    {
      icon: HelpCircle,
      title: "FAQ & Resources",
      description: "Browse our knowledge base",
      action: "View FAQs",
    },
  ];

  return (
    <section
      ref={ref}
      id="help"
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
            How Can We{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Help You?
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our dedicated support team is here to assist you 24/7. Choose your
            preferred way to get help.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {helpOptions.map((option, index) => (
            <motion.div
              key={option.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative p-6 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10 text-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto mb-4"
                >
                  <option.icon className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {option.description}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="group-hover:bg-primary group-hover:text-white transition-colors"
                >
                  {option.action}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-gradient-to-r from-primary to-accent rounded-3xl p-8 md:p-12 text-center text-white"
        >
          <h3 className="text-3xl font-bold mb-4">Need Urgent Assistance?</h3>
          <p className="text-lg mb-6 opacity-90">
            For medical emergencies, please call emergency services (911) or
            visit your nearest emergency room
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
            >
              Emergency Hotline: 1-800-HELP-NOW
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HelpSection;