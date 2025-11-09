import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Activity, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const HealthRecordsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // STORAGE CONFIGURATION:
  // PDFs are stored in Supabase Cloud Storage (bucket: 'health-records')
  // Path format: {user_id}/{filename}
  // For local file storage, see BACKEND_DOCUMENTATION.md

  const handleUpload = async (event) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("health-records")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert record
      const { error: insertError } = await supabase.from("health_records").insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        analysis_status: "pending",
      });

      if (insertError) throw insertError;

      toast({
        title: "Upload Successful",
        description: "Your health record is being analyzed...",
      });

      // Trigger backend processing
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-health-record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ filePath }),
      });

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const features = [
    {
      icon: FileUp,
      title: "Upload Health Records",
      description: "Upload your medical reports and health documents in PDF format",
    },
    {
      icon: Activity,
      title: "AI Analysis",
      description: "Our AI analyzes your health records to generate insights",
    },
    {
      icon: Upload,
      title: "Track Your Health",
      description: "Monitor your health score and get personalized recommendations",
    },
  ];

  return (
    <section
      ref={ref}
      id="health-records"
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
              Keep Your Health in{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Check
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Upload your health records in PDF format and let our AI analyze them
              to calculate your health score and provide personalized recommendations.
            </p>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              className="hidden"
              id="health-record-upload"
            />
            <Button
              size="lg"
              onClick={() => {
                if (!user) {
                  navigate("/auth");
                } else {
                  document.getElementById("health-record-upload")?.click();
                }
              }}
              disabled={uploading}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/50 transition-all duration-300"
            >
              {uploading ? "Uploading..." : user ? "Upload Health Record" : "Sign In to Upload"}
              <FileUp className="ml-2" />
            </Button>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative w-full aspect-square max-w-md mx-auto">
              <motion.div
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl backdrop-blur-sm border border-primary/30 flex items-center justify-center"
              >
                <FileUp className="w-32 h-32 text-primary/50" />
              </motion.div>
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl blur-2xl -z-10"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HealthRecordsSection;
