import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, FileText, ArrowLeft, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New appointment form state
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user) {
      fetchPatientData();
    }
  }, [user]);

  const fetchPatientData = async () => {
    try {
      // Fetch appointments
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(`
          *,
          doctor:profiles!appointments_doctor_id_fkey(full_name, phone)
        `)
        .eq("patient_id", user?.id)
        .order("appointment_date", { ascending: true });

      if (apptError) throw apptError;
      setAppointments(apptData || []);

      // Fetch prescriptions
      const { data: prescData, error: prescError } = await supabase
        .from("prescriptions")
        .select(`
          *,
          doctor:profiles!prescriptions_doctor_id_fkey(full_name)
        `)
        .eq("patient_id", user?.id)
        .order("prescribed_date", { ascending: false });

      if (prescError) throw prescError;
      setPrescriptions(prescData || []);

      // Fetch doctors (users with doctor role)
      const { data: doctorRoles, error: doctorError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "doctor");

      if (doctorError) throw doctorError;

      if (doctorRoles && doctorRoles.length > 0) {
        const doctorIds = doctorRoles.map((r) => r.user_id);
        const { data: doctorProfiles, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", doctorIds);

        if (profileError) throw profileError;
        setDoctors(doctorProfiles || []);
      }
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
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
      const { error } = await supabase.from("appointments").insert({
        patient_id: user?.id,
        doctor_id: selectedDoctor,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Appointment booked successfully");
      setSelectedDoctor("");
      setAppointmentDate("");
      setAppointmentTime("");
      setNotes("");
      fetchPatientData();
    } catch (error: any) {
      toast.error("Failed to book appointment: " + error.message);
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
          <h1 className="text-4xl font-bold">Patient Dashboard</h1>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <FileText className="mr-2 h-4 w-4" />
              Prescriptions
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
                        {doctors.map((doc) => (
                          <option key={doc.user_id} value={doc.user_id}>
                            {doc.full_name || "Doctor"}
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
                              Dr. {apt.doctor?.full_name || "N/A"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {apt.appointment_date} at {apt.appointment_time}
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
                        <TableCell>{presc.prescribed_date}</TableCell>
                        <TableCell>Dr. {presc.doctor?.full_name || "N/A"}</TableCell>
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
        </Tabs>
      </div>
    </div>
  );
}