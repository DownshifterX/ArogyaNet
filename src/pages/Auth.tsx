import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import WelcomeAnimation from "@/components/WelcomeAnimation";

// Email schemas
// - Login: allow normal emails and shorthand user@doctor or user@admin
// - Signup: allow normal emails and shorthand user@doctor only
const loginEmailSchema = z.union([
  z.string().email("Invalid email address"),
  z.string().regex(/^[A-Za-z0-9._%+-]+@(doctor|admin)$/i, "Invalid internal address (use user@doctor or user@admin)"),
]);

const signupEmailSchema = z.union([
  z.string().email("Invalid email address"),
  z.string().regex(/^[A-Za-z0-9._%+-]+@(doctor)$/i, "Invalid internal address (use user@doctor)"),
]);

const loginSchema = z.object({
  email: loginEmailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z
  .object({
    email: signupEmailSchema,
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    fullName: z.string().min(2, "Name must be at least 2 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type UserRole = "patient" | "doctor" | "admin";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, signup, user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, confirmPassword, fullName });
      }

      if (isLogin) {
        // Call login from useAuth context
        const success = await login(email, password);
        if (success) {
          toast({
            title: "Login successful!",
            description: `Welcome back!`,
          });
          setShowWelcome(true);
        } else {
          toast({
            title: "Login Failed",
            description: "Invalid credentials",
            variant: "destructive",
          });
        }
      } else {
        // Call signup from useAuth context
  const success = await signup(email, password, fullName);
        if (success) {
          toast({
            title: "Account created successfully!",
            description: `Welcome to ArogyaNet!`,
          });
          setShowWelcome(true);
        } else {
          toast({
            title: "Signup Failed",
            description: "Could not create account",
            variant: "destructive",
          });
        }
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: (error instanceof Error ? error.message : String(error)) || "An error occurred during authentication",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    
    // Redirect based on user role from context
    if (user) {
      const userRole = user.role as UserRole;
      
      if (userRole === "admin") {
        navigate("/admin-panel");
      } else if (userRole === "doctor") {
        navigate("/doctor-dashboard");
      } else if (userRole === "patient") {
        navigate("/patient-dashboard");
      } else {
        navigate("/");
      }
    } else {
      navigate("/");
    }
  };

  if (showWelcome && user) {
    return <WelcomeAnimation onComplete={handleWelcomeComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background relative overflow-hidden px-4">
      {/* Animated Background */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [90, 0, 90],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-accent/10 rounded-full blur-3xl"
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-foreground hover:text-primary transition-colors touch-target"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="font-medium text-sm sm:text-base">Back to Home</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md p-6 sm:p-8 m-4 bg-card/80 backdrop-blur-lg rounded-2xl border border-border shadow-2xl relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ArogyaNet
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>

          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/50 transition-all"
            disabled={loading}
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>


      </motion.div>
    </div>
  );
};

export default Auth;
