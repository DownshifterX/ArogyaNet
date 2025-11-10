import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Calendar, FileText, ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Combine profiles with roles
      const combinedUsers = profilesData?.map((profile) => ({
        ...profile,
        role: rolesData?.find((r) => r.user_id === profile.user_id)?.role,
        role_id: rolesData?.find((r) => r.user_id === profile.user_id)?.id,
      })) || [];

      setUsers(combinedUsers);

      // Fetch all appointments with manual name fetching
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", { ascending: false });

      if (apptError) {
        console.error('Appointments error:', apptError);
      } else if (apptData) {
        // Fetch names separately for each appointment
        const appointmentsWithNames = await Promise.all(
          apptData.map(async (apt) => {
            const [patientResult, doctorResult] = await Promise.all([
              supabase.from("profiles").select("full_name").eq("user_id", apt.patient_id).maybeSingle(),
              supabase.from("profiles").select("full_name").eq("user_id", apt.doctor_id).maybeSingle()
            ]);
            return {
              ...apt,
              patient: patientResult.data,
              doctor: doctorResult.data
            };
          })
        );
        setAppointments(appointmentsWithNames);
      }

      // Fetch all prescriptions with manual name fetching
      const { data: prescData, error: prescError } = await supabase
        .from("prescriptions")
        .select("*")
        .order("prescribed_date", { ascending: false });

      if (prescError) {
        console.error('Prescriptions error:', prescError);
      } else if (prescData) {
        // Fetch names separately for each prescription
        const prescriptionsWithNames = await Promise.all(
          prescData.map(async (presc) => {
            const [patientResult, doctorResult] = await Promise.all([
              supabase.from("profiles").select("full_name").eq("user_id", presc.patient_id).maybeSingle(),
              supabase.from("profiles").select("full_name").eq("user_id", presc.doctor_id).maybeSingle()
            ]);
            return {
              ...presc,
              patient: patientResult.data,
              doctor: doctorResult.data
            };
          })
        );
        setPrescriptions(prescriptionsWithNames);
      }
    } catch (error) {
      console.error('Admin panel error:', error);
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, roleId, newRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleId);

      if (error) throw error;
      toast.success("User role updated successfully");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to update role: " + error.message);
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
          <h1 className="text-4xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Admin Panel
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Patients: {users.filter((u) => u.role === "patient").length} | 
                Doctors: {users.filter((u) => u.role === "doctor").length} | 
                Admins: {users.filter((u) => u.role === "admin").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">
                Pending: {appointments.filter((a) => a.status === "pending").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prescriptions.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <FileText className="mr-2 h-4 w-4" />
              Prescriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || "N/A"}</TableCell>
                        <TableCell>{user.phone || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === "admin" ? "bg-red-100 text-red-800" :
                            user.role === "doctor" ? "bg-blue-100 text-blue-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              updateUserRole(user.user_id, user.role_id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="patient">Patient</SelectItem>
                              <SelectItem value="doctor">Doctor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
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

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>System-wide appointment overview</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{apt.appointment_date}</TableCell>
                        <TableCell>{apt.appointment_time}</TableCell>
                        <TableCell>{apt.patient?.full_name || "N/A"}</TableCell>
                        <TableCell>{apt.doctor?.full_name || "N/A"}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions">
            <Card>
              <CardHeader>
                <CardTitle>All Prescriptions</CardTitle>
                <CardDescription>System-wide prescription overview</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient</TableHead>
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
                        <TableCell>{presc.patient?.full_name || "N/A"}</TableCell>
                        <TableCell>{presc.doctor?.full_name || "N/A"}</TableCell>
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