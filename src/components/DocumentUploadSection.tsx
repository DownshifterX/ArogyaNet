import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { apiClient, type MedicalDocument } from "@/api/client";

const DocumentUploadSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) {
        setDocuments([]);
        return;
      }
      try {
        setLoadingDocs(true);
        const docs = await apiClient.listDocuments();
        setDocuments(docs);
      } catch (error: any) {
        console.error("Error loading documents:", error);
        toast({
          title: "Unable to load documents",
          description: error.message || "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchDocuments();
  }, [user, toast]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload documents",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF, DOCX, or image files only",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const uploaded = await apiClient.uploadDocument(file);
      if (!uploaded) {
        throw new Error("Upload failed");
      }

      toast({ title: "Upload Successful", description: "Your document has been uploaded and is being processed" });
      setDocuments((prev) => [uploaded, ...prev]);

      // Redirect to dashboard based on role
      if (user?.role === 'patient') navigate('/patient-dashboard');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <section id="upload-documents" className="py-20 px-6 bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Upload Health Documents
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Securely upload your medical records, lab reports, and health documents for analysis
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploading}
            />

            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                  <p className="text-lg font-semibold mb-2">Uploading...</p>
                  <p className="text-sm text-muted-foreground">Please wait while we process your document</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-6">
                    <Upload className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    Drop your files here
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    or click to browse
                  </p>
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    Select File
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">Secure Storage</h4>
              <p className="text-sm text-muted-foreground">
                End-to-end encrypted storage
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">AI Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Automatic document processing
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">HIPAA Compliant</h4>
              <p className="text-sm text-muted-foreground">
                Meets healthcare standards
              </p>
            </motion.div>
          </div>

          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              viewport={{ once: true }}
              className="mt-12"
            >
              <h3 className="text-2xl font-semibold mb-4">My Documents</h3>
              <div className="border rounded-xl p-6 bg-background/60 backdrop-blur">
                {loadingDocs ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading documents...
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {documents.map((doc) => {
                      const created = doc.createdAt ? new Date(doc.createdAt) : null;
                      const sizeMb = ((doc.size ?? 0) / 1024 / 1024).toFixed(2);
                      return (
                        <li key={doc.id} className="flex items-center justify-between gap-4 border border-border/60 rounded-lg p-4 hover:border-primary/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{doc.originalName}</p>
                              <p className="text-xs text-muted-foreground">
                                {(created && !Number.isNaN(created.getTime()) ? created.toLocaleString() : "Unknown date")} &bull; {sizeMb} MB
                              </p>
                            </div>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <a href={doc.url} target="_blank" rel="noreferrer">
                              View
                            </a>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default DocumentUploadSection;
