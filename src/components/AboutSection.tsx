import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Linkedin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const creators = [
  {
    name: "Aryan Sethi",
    enrollment: "99231030",
    batch: "F2",
    github: "https://github.com/PoopApple",
    linkedin: "https://www.linkedin.com/in/aryan-sethi-842034307/",
    imageUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Aryan%20Sethi&backgroundType=gradientLinear",
  },
  {
    name: "Pratham Arora",
    enrollment: "9923103044",
    batch: "F2",
    github: "https://github.com/DownshifterX",
    linkedin: "https://www.linkedin.com/in/pratham-arora-673154293/",
    imageUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Pratham%20Arora&backgroundType=gradientLinear",
  },
  {
    name: "Suvraaj Nandwani",
    enrollment: "9923103052",
    batch: "F2",
    github: "https://github.com/SUVRAAJ",
    linkedin: "https://www.linkedin.com/in/suvraaj-nandwani-079753274/",
    imageUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Suvraaj%20Nandwani&backgroundType=gradientLinear",
  },
];

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="about"
      className="py-24 px-6 bg-gradient-to-b from-secondary to-background"
    >
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            About <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Us</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet the creators behind ArogyaNet.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="border-border hover:border-primary/50 transition-colors rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                        <AvatarImage src={c.imageUrl} alt={c.name} />
                        <AvatarFallback>
                          {c.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{c.name}</h3>
                      <p className="text-sm text-muted-foreground">Enrollment: {c.enrollment}</p>
                      <p className="text-sm text-muted-foreground">Batch: {c.batch}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={c.github} target="_blank" rel="noopener noreferrer">
                        <Github className="w-4 h-4" /> GitHub
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={c.linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
