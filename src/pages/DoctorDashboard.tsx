import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, type Appointment, type Prescription, type User } from "@/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Users, FileText, ArrowLeft, AlertTriangle, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VideoCall from "@/components/VideoCall";

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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeCall, setActiveCall] = useState<{ appointmentId: string; remoteUserId: string } | null>(null);

  const [selectedPatient, setSelectedPatient] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");

  const isDoctorPendingApproval = user?.role === "doctor" && user.doctorApproved === false;

  useEffect(() => {
    // Initialize socket connection
    let newSocket: Socket | null = null;

    const initSocket = async () => {
      try {
        const { io } = await import("socket.io-client");
        newSocket = io("http://localhost:8090", {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        newSocket.on("connect", () => {
          console.log("✅ Doctor Socket connected:", newSocket?.id);
          newSocket?.emit("identify", user?.id);
        });

        newSocket.on("disconnect", () => {
          console.log("❌ Doctor Socket disconnected");
        });

        // Listen for patient accepting the call
        newSocket.on("callAccepted", (data: Record<string, unknown>) => {
          console.log("✅ Patient accepted call:", data);
        });

        setSocket(newSocket);
      } catch (error) {
        console.error("Socket initialization error:", error);
      }
    };

    if (user?.id) {
      initSocket();
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user?.id]);

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

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [apptData, prescriptionData] = await Promise.all([
        apiClient.getAppointments(),
        apiClient.getPrescriptions(),
      ]);

      setAppointments(apptData);
      setPrescriptions(prescriptionData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to load data: " + errorMessage);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
          <h1 className="text-4xl font-bold">Doctor Dashboard</h1>
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

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
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
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{formatDate(apt.startAt)}</TableCell>
                        <TableCell>{formatTime(apt.startAt)}</TableCell>
                        <TableCell>{apt.patient?.name || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(apt.status)}`}>
                            {apt.status}
                          </span>
                        </TableCell>
                        <TableCell>{apt.notes || "-"}</TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              console.log('📱 Call button clicked');
                              console.log('👤 apt.patient?.id:', apt.patient?.id);
                              console.log('🔌 socket:', socket);
                              if (apt.patient?.id && socket) {
                                // Emit incoming video call notification to patient
                                console.log('📞 Emitting incomingVideoCall');
                                socket.emit('incomingVideoCall', {
                                  remoteUserId: apt.patient.id,
                                  callerName: user?.name || 'Doctor',
                                  appointmentId: apt.id
                                });
                                console.log('✅ incomingVideoCall emitted');
                                setActiveCall({ appointmentId: apt.id, remoteUserId: apt.patient.id });
                              } else {
                                console.log('❌ Missing patient ID or socket connection');
                              }
                            }}
                            className="gap-1"
                          >
                            <Video className="h-4 w-4" />
                            Call
                          </Button>
                          <Select
                            value={apt.status}
                            onValueChange={(value) => updateAppointmentStatus(apt.id, value as Appointment["status"])}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
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
              isInitiator={true}
              onCallEnd={() => setActiveCall(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}