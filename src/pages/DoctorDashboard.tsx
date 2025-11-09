import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Users, FileText, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New prescription form state
  const [selectedPatient, setSelectedPatient] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (user) {
      fetchDoctorData();
    }
  }, [user]);

  const fetchDoctorData = async () => {
    try {
      // Fetch appointments
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(full_name, phone)
        `)
        .eq("doctor_id", user?.id)
        .order("appointment_date", { ascending: true });

      if (apptError) throw apptError;
      setAppointments(apptData || []);

      // Fetch unique patients from appointments
      const uniquePatients: any[] = [];
      const seenIds = new Set();
      
      apptData?.forEach((apt: any) => {
        if (!seenIds.has(apt.patient_id) && apt.patient) {
          seenIds.add(apt.patient_id);
          uniquePatients.push({
            id: apt.patient_id,
            full_name: apt.patient.full_name,
            phone: apt.patient.phone
          });
        }
      });
      
      setPatients(uniquePatients);

      // Fetch prescriptions
      const { data: prescData, error: prescError } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patient:profiles!prescriptions_patient_id_fkey(full_name)
        `)
        .eq("doctor_id", user?.id)
        .order("prescribed_date", { ascending: false });

      if (prescError) throw prescError;
      setPrescriptions(prescData || []);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      toast.success("Appointment status updated");
      fetchDoctorData();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    }
  };

  const createPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !medication || !dosage) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("prescriptions").insert({
        patient_id: selectedPatient,
        doctor_id: user?.id,
        medication,
        dosage,
        instructions,
      });

      if (error) throw error;
      toast.success("Prescription created successfully");
      setSelectedPatient("");
      setMedication("");
      setDosage("");
      setInstructions("");
      fetchDoctorData();
    } catch (error: any) {
      toast.error("Failed to create prescription: " + error.message);
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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
          <h1 className="text-4xl font-bold">Doctor Dashboard</h1>
        </div>

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
                        <TableCell>{apt.appointment_date}</TableCell>
                        <TableCell>{apt.appointment_time}</TableCell>
                        <TableCell>{apt.patient?.full_name || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            apt.status === "completed" ? "bg-green-100 text-green-800" :
                            apt.status === "confirmed" ? "bg-blue-100 text-blue-800" :
                            apt.status === "cancelled" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {apt.status}
                          </span>
                        </TableCell>
                        <TableCell>{apt.notes || "-"}</TableCell>
                        <TableCell>
                          <Select
                            value={apt.status}
                            onValueChange={(value) => updateAppointmentStatus(apt.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
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
                        <TableCell>{patient.full_name || "N/A"}</TableCell>
                        <TableCell>{patient.phone || "N/A"}</TableCell>
                        <TableCell>
                          {appointments.filter((a) => a.patient_id === patient.id).length}
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
                              {p.full_name}
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
                        <div className="font-semibold">{presc.patient?.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {presc.prescribed_date}
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
    </div>
  );
}