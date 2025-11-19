import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, type Appointment, type Prescription, type User, type MedicalDocument, type LiverMeasurements, type LiverAssessment } from "@/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, FileText, ArrowLeft, Clock, Video, RefreshCcw, Lock, Paperclip, Stethoscope, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VideoCall from "@/components/VideoCall";
import { useSocket } from "@/hooks/useSocket";
import EncryptionKeyManager from "@/components/EncryptionKeyManager";
import { Switch } from "@/components/ui/switch";

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<LiverAssessment[]>([]);
  const socket = useSocket();
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; appointmentId: string; callerId: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ appointmentId: string; remoteUserId: string } | null>(null);
  const [activeTab, setActiveTab] = useState("appointments");
  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  // Health measurements form
  const [meas, setMeas] = useState<LiverMeasurements>({
    Age: 0,
    TB: 0,
    DB: 0,
    ALKP: 0,
    SGPT: 0,
    SGOT: 0,
    TP: 0,
    ALB: 0,
    AGR: 0,
    Gender: 0,
  });

  // New appointment form state
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleIncomingCall = useCallback((data: Record<string, unknown>) => {
    console.log("📞 handleIncomingCall called with:", data);
    const callData = data as { callerName: string; appointmentId: string; callerId: string };
    setIncomingCall(callData);
    toast.info(`${callData.callerName} is calling...`);
    console.log("✅ setIncomingCall triggered");
  }, []); // Empty deps - this callback should be stable

  useEffect(() => {
    if (socket && user?.id) {
      socket.emit("identify", user.id);
      console.log("👤 Patient identified - User ID:", user.id, "Socket ID:", socket.id);
    }
  }, [socket, user?.id]);

  // Listen for new schema notifications and reflect in dashboard tab
  useEffect(() => {
    if (!socket) return;
    const onIncoming = (data: { doctorName: string; appointmentId: string; doctorUserId: string }) => {
      console.log("📥 notification:incoming:call (PatientDashboard)", data);
      setIncomingCall({ callerName: data.doctorName, appointmentId: data.appointmentId, callerId: data.doctorUserId });
      setActiveTab("video");
    };
    socket.on('notification:incoming:call', onIncoming);
    return () => { socket.off('notification:incoming:call', onIncoming); };
  }, [socket]);

  // Debug: Log when incomingCall changes
  useEffect(() => {
    console.log("🔍 incomingCall state updated:", incomingCall);
    // Auto-switch to video tab when incoming call arrives
    if (incomingCall) {
      setActiveTab("video");
    }
  }, [incomingCall]);

  useEffect(() => {
    if (user) {
      fetchPatientData();
    }
  }, [user]);

  const fetchPatientData = async () => {
    try {
      const [apptData, prescriptionData, doctorData, docs, asmts] = await Promise.all([
        apiClient.getAppointments(),
        apiClient.getPrescriptions(),
        apiClient.getDoctors(),
        apiClient.listDocuments(),
        apiClient.listLiverAssessments(),
      ]);

      setAppointments(apptData || []);
      setPrescriptions(prescriptionData || []);
      setDoctors(doctorData || []);
      setDocuments(docs || []);
      setAssessments(asmts || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to load data: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate || !appointmentTime) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const startAt = new Date(`${appointmentDate}T${appointmentTime}`);
      if (Number.isNaN(startAt.getTime())) {
        throw new Error("Invalid date or time");
      }

      const result = await apiClient.createAppointment({
        doctorId: selectedDoctor,
        startAt: startAt.toISOString(),
        notes,
      });
      if (result) {
        toast.success("Appointment booked successfully");
        setSelectedDoctor("");
        setAppointmentDate("");
        setAppointmentTime("");
        setNotes("");
        // optimistically prepend new appointment
        if (result) {
          setAppointments((prev) => [result, ...prev]);
        } else {
          fetchPatientData();
        }
      } else {
        toast.error("Failed to book appointment");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to book appointment: " + errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/")}> 
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            <h1 className="text-4xl font-bold">Patient Dashboard</h1>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Personal information and account status</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium break-words">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{user.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Visits</p>
                <p className="font-medium">{appointments.filter((apt) => apt.status !== "completed" && apt.status !== "cancelled").length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security moved into its own tab below */}

        <Tabs defaultValue="appointments" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="video" className={incomingCall ? "bg-red-100" : ""}>
              <Video className="mr-2 h-4 w-4" />
              Video Call
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <FileText className="mr-2 h-4 w-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="documents">
              <Paperclip className="mr-2 h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="health">
              <Stethoscope className="mr-2 h-4 w-4"/>
              Health
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Book Appointment</CardTitle>
                  <CardDescription>Schedule a consultation with a doctor</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={bookAppointment} className="space-y-4">
                    <div>
                      <Label>Select Doctor</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                      >
                        <option value="">Choose a doctor</option>
                        {doctors
                          .filter((doc) => doc.doctorApproved !== false)
                          .map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name || "Doctor"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Describe your symptoms or concerns..."
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Clock className="mr-2 h-4 w-4" />
                      Book Appointment
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Appointments</CardTitle>
                  <CardDescription>Your scheduled appointments</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto">
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">
                              Dr. {apt.doctor?.name || "N/A"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {apt.startAt ? new Date(apt.startAt).toLocaleDateString() : "N/A"} at{" "}
                              {apt.startAt ? new Date(apt.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                            </div>
                            {apt.notes && (
                              <div className="text-sm mt-2">{apt.notes}</div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            apt.status === "completed" ? "bg-green-100 text-green-800" :
                            apt.status === "confirmed" ? "bg-blue-100 text-blue-800" :
                            apt.status === "cancelled" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prescriptions">
            <Card>
              <CardHeader>
                <CardTitle>My Prescriptions</CardTitle>
                <CardDescription>Your prescribed medications</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Instructions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.map((presc) => (
                      <TableRow key={presc.id}>
                        <TableCell>{presc.createdAt ? new Date(presc.createdAt).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell>Dr. {presc.doctor?.name || "N/A"}</TableCell>
                        <TableCell>{presc.medication}</TableCell>
                        <TableCell>{presc.dosage}</TableCell>
                        <TableCell>{presc.instructions || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            {incomingCall && socket ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Incoming Video Call</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-lg">
                      <strong>{incomingCall.callerName}</strong> is calling you...
                    </p>
                    <div className="flex gap-4">
                      <Button
                        onClick={() => setIncomingCall(null)}
                        variant="destructive"
                        className="flex-1"
                      >
                        Decline
                      </Button>
                      <Button
                        onClick={async () => {
                          const doctorId = appointments.find(a => a.id === incomingCall.appointmentId)?.doctor?.id || incomingCall.callerId;
                          if (!doctorId || !socket) {
                            console.error("❌ Cannot accept call: missing doctorId or socket");
                            console.error("   doctorId:", doctorId, "socket:", socket, "socket.connected:", socket?.connected);
                            toast.error("Cannot accept call: Connection issue");
                            return;
                          }

                          if (!socket.connected) {
                            console.error("❌ Socket not connected");
                            toast.error("Not connected to server. Please wait...");
                            return;
                          }

                          console.log("✅ Patient accepting call, notifying doctor");
                          console.log("📞 Doctor ID:", doctorId, "Appointment ID:", incomingCall.appointmentId);
                          console.log("📞 Socket ID:", socket.id, "Socket connected:", socket.connected);
                          
                          // Emit callAccepted FIRST before changing state (to avoid socket disconnect)
                          socket.emit("call:accepted", {
                            to: doctorId,
                            ans: { accepted: true, appointmentId: incomingCall.appointmentId },
                          });
                          console.log("✅ call:accepted event emitted to doctor");
                          
                          // Then show VideoCall component - it will wait for the offer
                          setActiveCall({ appointmentId: incomingCall.appointmentId, remoteUserId: doctorId });
                          setIncomingCall(null);
                        }}
                        className="flex-1"
                      >
                        Accept Call
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Video Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">No incoming calls at the moment.</p>
                    <p className="text-sm mt-2">When a doctor initiates a video call, it will appear here.</p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Document</CardTitle>
                  <CardDescription>PDF, images, or Word documents up to 10MB</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept="application/pdf,image/*,.doc,.docx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                    
                    {/* Encryption Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Lock className={`w-4 h-4 ${encryptionEnabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                        <div>
                          <Label htmlFor="encrypt-toggle" className="text-sm font-medium cursor-pointer">
                            Encrypt Document
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            ChaCha20 client-side encryption
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="encrypt-toggle"
                        checked={encryptionEnabled}
                        onCheckedChange={setEncryptionEnabled}
                        disabled={uploading}
                      />
                    </div>

                    <Button
                      className="w-full"
                      disabled={!selectedFile || uploading}
                      onClick={async () => {
                        if (!selectedFile) return;
                        try {
                          setUploading(true);
                          const uploaded = await apiClient.uploadDocument(selectedFile, encryptionEnabled);
                          if (uploaded) {
                            const encMsg = encryptionEnabled ? ' and encrypted' : '';
                            toast.success(`Uploaded successfully${encMsg}`);
                            setSelectedFile(null);
                            // Refresh document list
                            const docs = await apiClient.listDocuments();
                            setDocuments(docs);
                          } else {
                            toast.error('Upload failed');
                          }
                        } catch (err) {
                          toast.error('Upload error');
                        } finally {
                          setUploading(false);
                        }
                      }}
                    >
                      {uploading ? 'Uploading…' : 'Upload'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Documents</CardTitle>
                  <CardDescription>Your uploaded medical documents</CardDescription>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => {
                          const handleView = async () => {
                            console.log('[View] Button clicked for document:', {
                              id: doc.id,
                              name: doc.originalName,
                              encrypted: doc.encrypted,
                              mimeType: doc.mimeType,
                            });

                            if (doc.encrypted) {
                              console.log('[View] Document is encrypted, calling downloadAndDecryptDocument');
                              try {
                                const blob = await apiClient.downloadAndDecryptDocument(doc);
                                console.log('[View] Got blob:', blob);
                                if (blob) {
                                  const url = URL.createObjectURL(blob);
                                  console.log('[View] Created object URL:', url);
                                  window.open(url, '_blank');
                                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                                  toast.success('Document decrypted successfully');
                                } else {
                                  console.error('[View] Blob is null');
                                  toast.error('Failed to decrypt document');
                                }
                              } catch (error) {
                                console.error('[View] Decryption error:', error);
                                toast.error(error instanceof Error ? error.message : 'Failed to decrypt document');
                              }
                            } else {
                              console.log('[View] Document not encrypted, getting direct URL');
                              const url = await apiClient.getDocumentDownloadUrl(doc.id);
                              console.log('[View] Got download URL:', url);
                              if (url) {
                                window.open(url, '_blank');
                              } else {
                                toast.error('Failed to get download link');
                              }
                            }
                          };

                          return (
                            <TableRow key={doc.id}>
                              <TableCell className="max-w-[220px]">
                                <div className="flex items-center gap-2">
                                  <span className="truncate" title={doc.originalName}>{doc.originalName}</span>
                                  {doc.encrypted && (
                                    <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded whitespace-nowrap">
                                      🔒 Encrypted
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{doc.mimeType || '-'}</TableCell>
                              <TableCell>{(doc.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                              <TableCell>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</TableCell>
                              <TableCell className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleView}
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    if (confirm(`Delete ${doc.originalName}?`)) {
                                      const success = await apiClient.deleteDocument(doc.id);
                                      if (success) {
                                        toast.success('Document deleted');
                                        setDocuments(documents.filter((d) => d.id !== doc.id));
                                      } else {
                                        toast.error('Failed to delete');
                                      }
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>Liver Health Assessment</CardTitle>
                <CardDescription>Enter your latest readings. Your doctor can review results; you won't see the prediction here.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      // Simple validation
                      if (meas.Age <= 0) {
                        toast.error('Age must be greater than 0');
                        return;
                      }
                      const submitted = await apiClient.submitLiverAssessment(meas);
                      if (submitted) {
                        toast.success('Assessment submitted');
                        setMeas({ Age: 0, TB: 0, DB: 0, ALKP: 0, SGPT: 0, SGOT: 0, TP: 0, ALB: 0, AGR: 0, Gender: 0 });
                      } else {
                        toast.error('Failed to submit assessment');
                      }
                    } catch (err) {
                      toast.error('Submission error');
                    }
                  }}
                >
                  <div>
                    <Label>Age</Label>
                    <Input type="number" value={meas.Age} onChange={(e) => setMeas({ ...meas, Age: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Total Bilirubin (TB)</Label>
                    <Input type="number" step="0.01" value={meas.TB} onChange={(e) => setMeas({ ...meas, TB: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Direct Bilirubin (DB)</Label>
                    <Input type="number" step="0.01" value={meas.DB} onChange={(e) => setMeas({ ...meas, DB: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Alk Phosphatase (ALKP)</Label>
                    <Input type="number" value={meas.ALKP} onChange={(e) => setMeas({ ...meas, ALKP: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Alamine Aminotransferase (SGPT)</Label>
                    <Input type="number" value={meas.SGPT} onChange={(e) => setMeas({ ...meas, SGPT: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Aspartate Aminotransferase (SGOT)</Label>
                    <Input type="number" value={meas.SGOT} onChange={(e) => setMeas({ ...meas, SGOT: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Total Proteins (TP)</Label>
                    <Input type="number" step="0.01" value={meas.TP} onChange={(e) => setMeas({ ...meas, TP: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Albumin (ALB)</Label>
                    <Input type="number" step="0.01" value={meas.ALB} onChange={(e) => setMeas({ ...meas, ALB: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>A/G Ratio (AGR)</Label>
                    <Input type="number" step="0.01" value={meas.AGR} onChange={(e) => setMeas({ ...meas, AGR: Number(e.target.value) })} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Gender</Label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={meas.Gender}
                      onChange={(e) => setMeas({ ...meas, Gender: Number(e.target.value) })}
                    >
                      <option value={0}>Male</option>
                      <option value={1}>Female</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <Button type="submit" className="w-full">Submit Assessment</Button>
                  </div>
                </form>
                <div className="mt-8">
                  <div className="font-semibold mb-2">Your Past Submissions</div>
                  {assessments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assessments yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>TB</TableHead>
                          <TableHead>DB</TableHead>
                          <TableHead>ALKP</TableHead>
                          <TableHead>SGPT</TableHead>
                          <TableHead>SGOT</TableHead>
                          <TableHead>TP</TableHead>
                          <TableHead>ALB</TableHead>
                          <TableHead>AGR</TableHead>
                          <TableHead>Gender</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                            <TableCell>{a.measurements.TB}</TableCell>
                            <TableCell>{a.measurements.DB}</TableCell>
                            <TableCell>{a.measurements.ALKP}</TableCell>
                            <TableCell>{a.measurements.SGPT}</TableCell>
                            <TableCell>{a.measurements.SGOT}</TableCell>
                            <TableCell>{a.measurements.TP}</TableCell>
                            <TableCell>{a.measurements.ALB}</TableCell>
                            <TableCell>{a.measurements.AGR}</TableCell>
                            <TableCell>{a.measurements.Gender === 0 ? 'Male' : 'Female'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Current Password</Label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Confirm New Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={async () => {
                        if (!currentPassword || !newPassword || !confirmPassword) {
                          toast.error('Please fill all password fields');
                          return;
                        }
                        if (newPassword.length < 6) {
                          toast.error('New password must be at least 6 characters');
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          toast.error('Passwords do not match');
                          return;
                        }
                        const res = await apiClient.changePassword(currentPassword, newPassword);
                        if (res.success) {
                          toast.success(res.message || 'Password changed');
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        } else {
                          toast.error(res.message || 'Failed to change password');
                        }
                      }}
                    >
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <EncryptionKeyManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Call Modal */}
      {activeCall && socket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <VideoCall
              remoteUserId={activeCall.remoteUserId}
              appointmentId={activeCall.appointmentId}
              socket={socket}
              isInitiator={false}
              onCallEnd={() => {
                setActiveCall(null);
                setIncomingCall(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}