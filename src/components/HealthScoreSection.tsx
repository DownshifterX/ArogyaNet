import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Heart, Brain, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const HealthScoreSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCalculateScore = () => {
    if (!user) {
      navigate("/auth");
    } else {
      toast({
        title: "Health Score Calculator",
        description: "Redirecting to health score calculator...",
      });
    }
  };

  const metrics = [
    {
      icon: Heart,
      label: "Cardiovascular",
      value: 92,
      color: "from-red-500 to-pink-500",
    },
    {
      icon: Brain,
      label: "Mental Health",
      value: 88,
      color: "from-purple-500 to-indigo-500",
    },
    {
      icon: Activity,
      label: "Physical Fitness",
      value: 85,
      color: "from-primary to-accent",
    },
    {
      icon: TrendingUp,
      label: "Overall Score",
      value: 89,
      color: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <section
      ref={ref}
      id="health-score"
      className="py-24 px-6 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden"
    >
      {/* Animated Background */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl"
      />

      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              Calculate Your{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Health Score
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Get a comprehensive analysis of your health with our AI-powered
              health score calculator. Track multiple health metrics and receive
              personalized recommendations for improvement.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Real-time Monitoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Track your health metrics continuously with instant updates
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">AI-Powered Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    Get personalized recommendations based on your unique health profile
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Progress Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Visualize your health journey with detailed charts and reports
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleCalculateScore}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/50 transition-all duration-300"
            >
              {user ? "Calculate Your Score" : "Sign In to Calculate"}
            </Button>
          </motion.div>

          {/* Right Metrics */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-6"
          >
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative p-6 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-5 rounded-2xl`} />
                
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className={`w-12 h-12 bg-gradient-to-br ${metric.color} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <metric.icon className="w-6 h-6 text-white" />
                  </motion.div>

                  <div className="text-3xl font-bold mb-2">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : {}}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    >
                      {metric.value}
                    </motion.span>
                    <span className="text-muted-foreground text-xl">/100</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>

                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${metric.value}%` } : {}}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                      className={`h-full bg-gradient-to-r ${metric.color}`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HealthScoreSection;
