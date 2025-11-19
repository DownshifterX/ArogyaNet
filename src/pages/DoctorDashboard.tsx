import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { apiClient, type Appointment, type Prescription, type User, type MedicalDocument, type LiverAssessment } from "@/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Calendar, Users, FileText, ArrowLeft, AlertTriangle, Video, RefreshCcw, Lock, Paperclip, ChevronDown, ChevronRight, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";

const formatDate = (iso?: string) => {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
};

const formatTime = (iso?: string) => {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const statusBadge = (status: Appointment["status"]) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<{ appointmentId: string; remoteUserId: string } | null>(null);
  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Documents state
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [assessments, setAssessments] = useState<LiverAssessment[]>([]);
  const [expandedAssessments, setExpandedAssessments] = useState<Set<string>>(new Set());

  const [selectedPatient, setSelectedPatient] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");

  const isDoctorPendingApproval = user?.role === "doctor" && user.doctorApproved === false;

  // Identify user with socket
  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('identify', user.id);
      console.log('👤 Doctor identified - User ID:', user.id, 'Socket ID:', socket.id);
    }
  }, [socket, user?.id]);

  useEffect(() => {
    if (!user) return;
    if (isDoctorPendingApproval) {
      setLoading(false);
      return;
    }
    fetchDoctorData();
  }, [user, isDoctorPendingApproval]);

  const patients = useMemo(() => {
    const map = new Map<string, User>();
    appointments.forEach((apt) => {
      if (apt.patient) {
        map.set(apt.patient.id, apt.patient);
      }
    });
    return Array.from(map.values());
  }, [appointments]);

  // Group documents by patient
  const documentsByPatient = useMemo(() => {
    const grouped = new Map<string, { patient: User | null; patientName: string; patientEmail: string; docs: MedicalDocument[] }>();
    
    documents.forEach((doc) => {
      // Backend returns patientId with each document
      const patientId = doc.patientId || 'unknown';
      const patient = patients.find(p => p.id === patientId) || null;
      const patientName = doc.patientName || patient?.name || 'Unknown Patient';
      const patientEmail = doc.patientEmail || patient?.email || '';
      
      if (!grouped.has(patientId)) {
        grouped.set(patientId, { patient, patientName, patientEmail, docs: [] });
      }
      grouped.get(patientId)!.docs.push(doc);
    });
    
    return Array.from(grouped.entries()).filter(([id]) => id !== 'unknown');
  }, [documents, patients]);

  const togglePatientExpand = (patientId: string) => {
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [apptData, prescriptionData, docs, asmt] = await Promise.all([
        apiClient.getAppointments(),
        apiClient.getPrescriptions(),
        apiClient.listDocuments(),
        apiClient.listLiverAssessments(),
      ]);

      setAppointments(apptData);
      setPrescriptions(prescriptionData);
      setDocuments(docs);
      setAssessments(asmt);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to load data: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Group assessments by patient
  const assessmentsByPatient = useMemo(() => {
    const grouped = new Map<string, { patientName: string; patientEmail: string; items: LiverAssessment[] }>();
    assessments.forEach((a) => {
      const pid = a.patientId || 'unknown';
      if (!grouped.has(pid)) {
        grouped.set(pid, { patientName: a.patientName || 'Unknown Patient', patientEmail: a.patientEmail || '', items: [] });
      }
      grouped.get(pid)!.items.push(a);
    });
    // sort each patient's items by createdAt desc
    for (const [, v] of grouped) {
      v.items.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    }
    return Array.from(grouped.entries()).filter(([id]) => id !== 'unknown');
  }, [assessments]);

  const toggleAssessmentExpand = (patientId: string) => {
    setExpandedAssessments((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId); else next.add(patientId);
      return next;
    });
  };

  const updateAppointmentStatus = async (id: string, status: Appointment["status"]) => {
    try {
      const updated = await apiClient.updateAppointment(id, { status });
      if (!updated) throw new Error("Unable to update appointment");
      toast.success("Appointment status updated");
      setAppointments((prev) => prev.map((apt) => (apt.id === id ? updated : apt)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to update: " + errorMessage);
    }
  };

  const createPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !medication || !dosage) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const created = await apiClient.createPrescription({
        patientId: selectedPatient,
        medication,
        dosage,
        instructions,
      });
      if (!created) throw new Error("Unable to create prescription");
      toast.success("Prescription created successfully");
      setSelectedPatient("");
      setMedication("");
      setDosage("");
      setInstructions("");
      setPrescriptions((prev) => [created, ...prev]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to create prescription: " + errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isDoctorPendingApproval) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <CardTitle>Awaiting Admin Approval</CardTitle>
            <CardDescription>
              Your account is pending review. An administrator must approve your profile before you can access doctor tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground text-center">
            <p>We&apos;ll notify you once your account is approved. In the meantime, you can review your profile details or contact support.</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
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
            <h1 className="text-4xl font-bold">Doctor Dashboard</h1>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Current practitioner information</CardDescription>
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
                <p className="text-sm text-muted-foreground">Approval Status</p>
                <p className={`font-medium ${user.doctorApproved ? "text-green-600" : "text-yellow-600"}`}>
                  {user.doctorApproved ? "Approved" : "Pending admin review"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Appointments</p>
                <p className="font-medium">{appointments.filter((apt) => apt.status === "requested" || apt.status === "confirmed").length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security moved into its own tab below */}

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="patients">
              <Users className="mr-2 h-4 w-4" />
              Patients
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
            <Card>
              <CardHeader>
                <CardTitle>Manage Appointments</CardTitle>
                <CardDescription>View and update your patient appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{formatDate(apt.startAt)} {apt.endAt ? `- ${formatTime(apt.startAt)}` : ''}</TableCell>
                        <TableCell>{apt.patient?.name || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(apt.status)}`}>
                            {apt.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select value={apt.status} onValueChange={(value) => updateAppointmentStatus(apt.id, value as Appointment["status"]) }>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="requested">Requested</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle>Patient List</CardTitle>
                <CardDescription>Your registered patients</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Total Appointments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>{patient.name || "N/A"}</TableCell>
                        <TableCell>{patient.phone || "N/A"}</TableCell>
                        <TableCell>
                          {appointments.filter((a) => a.patient?.id === patient.id).length}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Create Prescription</CardTitle>
                  <CardDescription>Issue a new prescription for a patient</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createPrescription} className="space-y-4">
                    <div>
                      <Label>Patient</Label>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name || "Unnamed"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Medication</Label>
                      <Input
                        value={medication}
                        onChange={(e) => setMedication(e.target.value)}
                        placeholder="e.g., Amoxicillin"
                      />
                    </div>
                    <div>
                      <Label>Dosage</Label>
                      <Input
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="e.g., 500mg twice daily"
                      />
                    </div>
                    <div>
                      <Label>Instructions</Label>
                      <Textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Additional instructions..."
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Prescription</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Prescriptions</CardTitle>
                  <CardDescription>Recently issued prescriptions</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto">
                  <div className="space-y-4">
                    {prescriptions.map((presc) => (
                      <div key={presc.id} className="border rounded-lg p-4">
                        <div className="font-semibold">{presc.patient?.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(presc.createdAt)}
                        </div>
                        <div className="mt-2">
                          <strong>Medication:</strong> {presc.medication}
                        </div>
                        <div><strong>Dosage:</strong> {presc.dosage}</div>
                        {presc.instructions && (
                          <div className="text-sm mt-2">{presc.instructions}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Patient Documents</CardTitle>
                <CardDescription>View documents uploaded by your patients (read-only)</CardDescription>
              </CardHeader>
              <CardContent>
                {documentsByPatient.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No patient documents available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {documentsByPatient.map(([patientId, { patient, patientName, patientEmail, docs }]) => (
                      <Collapsible
                        key={patientId}
                        open={expandedPatients.has(patientId)}
                        onOpenChange={() => togglePatientExpand(patientId)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between hover:bg-accent"
                          >
                            <div className="flex items-center gap-3">
                              {expandedPatients.has(patientId) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{patientName}</span>
                                <span className="text-xs text-muted-foreground">ID: {patientId}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                ({docs.length} document{docs.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {patientEmail}
                            </span>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="border rounded-lg p-4 bg-muted/30">
                            {docs.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No documents for this patient.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {docs.map((doc) => (
                                    <TableRow key={doc.id}>
                                      <TableCell className="max-w-[220px] truncate" title={doc.originalName}>
                                        {doc.originalName}
                                      </TableCell>
                                      <TableCell className="text-xs">{doc.mimeType || '-'}</TableCell>
                                      <TableCell>{(doc.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                                      <TableCell>
                                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={async () => {
                                            const url = await apiClient.getDocumentDownloadUrl(doc.id);
                                            if (url) {
                                              window.open(url, '_blank');
                                            } else {
                                              toast.error('Failed to get download link');
                                            }
                                          }}
                                        >
                                          View
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>Patient Liver Assessments</CardTitle>
                <CardDescription>Latest assessments per patient with prediction details</CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentsByPatient.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assessments available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {assessmentsByPatient.map(([patientId, { patientName, patientEmail, items }]) => {
                      const latest = items[0];
                      return (
                        <Collapsible
                          key={patientId}
                          open={expandedAssessments.has(patientId)}
                          onOpenChange={() => toggleAssessmentExpand(patientId)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full justify-between hover:bg-accent">
                              <div className="flex items-center gap-3">
                                {expandedAssessments.has(patientId) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{patientName}</span>
                                  <span className="text-xs text-muted-foreground">ID: {patientId}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">({items.length} record{items.length !== 1 ? 's' : ''})</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{patientEmail}</span>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                              <div>
                                <div className="font-semibold mb-2">Latest Assessment ({new Date(latest.createdAt).toLocaleString()})</div>
                                <div className="grid md:grid-cols-4 gap-2 text-sm">
                                  <div>Age: {latest.measurements.Age}</div>
                                  <div>TB: {latest.measurements.TB}</div>
                                  <div>DB: {latest.measurements.DB}</div>
                                  <div>ALKP: {latest.measurements.ALKP}</div>
                                  <div>SGPT: {latest.measurements.SGPT}</div>
                                  <div>SGOT: {latest.measurements.SGOT}</div>
                                  <div>TP: {latest.measurements.TP}</div>
                                  <div>ALB: {latest.measurements.ALB}</div>
                                  <div>AGR: {latest.measurements.AGR}</div>
                                  <div>Gender: {latest.measurements.Gender === 0 ? 'Male' : 'Female'}</div>
                                </div>
                                {latest.result && (
                                  <div className="mt-3 text-sm">
                                    <div><strong>Prediction:</strong> {latest.result.prediction_label ?? latest.result.prediction}</div>
                                    {latest.result.probability && (
                                      <div className="text-xs text-muted-foreground">Prob: no-disease {latest.result.probability.no_disease ?? '-'}, disease {latest.result.probability.disease ?? '-'}</div>
                                    )}
                                    {typeof latest.result.confidence === 'number' && (
                                      <div className="text-xs text-muted-foreground">Confidence: {latest.result.confidence}</div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {items.length > 1 && (
                                <div className="mt-4">
                                  <div className="font-medium mb-2">History</div>
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
                                        <TableHead>Result</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.slice(1).map((it) => (
                                        <TableRow key={it.id}>
                                          <TableCell>{new Date(it.createdAt).toLocaleDateString()}</TableCell>
                                          <TableCell>{it.measurements.TB}</TableCell>
                                          <TableCell>{it.measurements.DB}</TableCell>
                                          <TableCell>{it.measurements.ALKP}</TableCell>
                                          <TableCell>{it.measurements.SGPT}</TableCell>
                                          <TableCell>{it.measurements.SGOT}</TableCell>
                                          <TableCell>{it.measurements.TP}</TableCell>
                                          <TableCell>{it.measurements.ALB}</TableCell>
                                          <TableCell>{it.measurements.AGR}</TableCell>
                                          <TableCell className="text-xs">{it.result?.prediction_label ?? it.result?.prediction ?? '-'}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
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
          </TabsContent>
        </Tabs>
      </div>


    </div>
  );
}