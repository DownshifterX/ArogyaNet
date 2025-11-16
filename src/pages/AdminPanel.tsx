import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, type Appointment, type Prescription, type User, type LiverAssessment } from "@/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Users, Calendar, FileText, ArrowLeft, Shield, RefreshCcw, Lock, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<LiverAssessment[]>([]);

  // Group assessments by patient for admin view
  const assessmentsByPatient = useMemo(() => {
    const grouped = new Map<string, { patientName: string; patientEmail: string; items: LiverAssessment[] }>();
    assessments.forEach((a) => {
      const pid = a.patientId || 'unknown';
      if (!grouped.has(pid)) {
        grouped.set(pid, { patientName: a.patientName || 'Unknown Patient', patientEmail: a.patientEmail || '', items: [] });
      }
      grouped.get(pid)!.items.push(a);
    });
    for (const [, v] of grouped) {
      v.items.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    }
    return Array.from(grouped.entries()).filter(([id]) => id !== 'unknown');
  }, [assessments]);
  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [fetchedUsers, fetchedAppointments, fetchedPrescriptions, fetchedAssessments] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getAppointments(),
        apiClient.getPrescriptions(),
        apiClient.listLiverAssessments(),
      ]);

      setUsers(fetchedUsers);
      setAppointments(fetchedAppointments);
  setPrescriptions(fetchedPrescriptions);
  setAssessments(fetchedAssessments);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Admin data fetch error:', error);
      toast.error("Failed to load data: " + msg);
    } finally {
      setLoading(false);
    }
  };

  // Do not allow assigning 'admin' from the panel
  const updateUserRole = async (userId: string, newRole: "patient" | "doctor") => {
    try {
      const updated = await apiClient.updateUserRole(userId, newRole);
      if (!updated) throw new Error("Unable to update role");
      toast.success("User role updated successfully");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u))
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Failed to update role: " + msg);
    }
  };

  const updateDoctorApproval = async (userId: string, approved: boolean) => {
    try {
      const updated = await apiClient.updateDoctorApproval(userId, approved);
      if (!updated) throw new Error("Unable to update approval");
      toast.success(approved ? "Doctor approved" : "Doctor approval revoked");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u))
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Failed to update approval: " + msg);
    }
  };

  const roleBreakdown = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      },
      {} as Record<User["role"], number>
    );
  }, [users]);

  const formatDate = (iso?: string) => {
    if (!iso) return "N/A";
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Panel
            </h1>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Signed in as an administrator</CardDescription>
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
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users Managed</p>
                <p className="font-medium">{users.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

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
                Patients: {roleBreakdown.patient ?? 0} | 
                Doctors: {roleBreakdown.doctor ?? 0} | 
                Admins: {roleBreakdown.admin ?? 0}
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
                Requested: {appointments.filter((a) => a.status === "requested").length}
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
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="health">
              Health
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="mr-2 h-4 w-4" />
              Security
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
                      <TableHead>Approval</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((managedUser) => (
                      <TableRow key={managedUser.id}>
                        <TableCell>{managedUser.name || "N/A"}</TableCell>
                        <TableCell>{managedUser.phone || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            managedUser.role === "admin" ? "bg-red-100 text-red-800" :
                            managedUser.role === "doctor" ? "bg-blue-100 text-blue-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {managedUser.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {managedUser.role === "doctor" ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={Boolean(managedUser.doctorApproved)}
                                onCheckedChange={(checked) =>
                                  updateDoctorApproval(managedUser.id, checked)
                                }
                                aria-label="Doctor approval toggle"
                              />
                              <span className="text-xs text-muted-foreground">
                                {managedUser.doctorApproved ? "Approved" : "Pending"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {managedUser.role === "admin" ? (
                            <span className="text-xs text-muted-foreground">Not editable</span>
                          ) : (
                            <Select
                              value={managedUser.role}
                              onValueChange={(value) =>
                                updateUserRole(managedUser.id, value as "patient" | "doctor")
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="patient">Patient</SelectItem>
                                <SelectItem value="doctor">Doctor</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
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
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{formatDate(apt.startAt)}</TableCell>
                        <TableCell>{apt.endAt ? formatDate(apt.endAt) : "-"}</TableCell>
                        <TableCell>{apt.patient?.name || "N/A"}</TableCell>
                        <TableCell>{apt.doctor?.name || "N/A"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(apt.status)}`}>
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
                        <TableCell>{formatDate(presc.createdAt)}</TableCell>
                        <TableCell>{presc.patient?.name || "N/A"}</TableCell>
                        <TableCell>{presc.doctor?.name || "N/A"}</TableCell>
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

          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>All Liver Assessments</CardTitle>
                <CardDescription>Grouped by patient. Latest visible; past submissions collapsed.</CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentsByPatient.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assessments available.</p>
                ) : (
                  <div className="space-y-3">
                    {assessmentsByPatient.map(([patientId, { patientName, patientEmail, items }]) => {
                      const latest = items[0];
                      return (
                        <div key={patientId} className="border rounded-lg p-4 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">{patientName}</span>
                              <span className="text-xs text-muted-foreground">{patientEmail} · ID: {patientId}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{items.length} record{items.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="mt-3">
                            <div className="font-semibold mb-2">Latest Assessment ({new Date(latest.createdAt).toLocaleString()})</div>
                            <div className="grid md:grid-cols-5 gap-2 text-sm">
                              <div>TB: {latest.measurements.TB}</div>
                              <div>DB: {latest.measurements.DB}</div>
                              <div>ALKP: {latest.measurements.ALKP}</div>
                              <div>SGPT: {latest.measurements.SGPT}</div>
                              <div>SGOT: {latest.measurements.SGOT}</div>
                              <div>TP: {latest.measurements.TP}</div>
                              <div>ALB: {latest.measurements.ALB}</div>
                              <div>AGR: {latest.measurements.AGR}</div>
                              <div>Age: {latest.measurements.Age}</div>
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
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button variant="outline" className="w-full justify-between">
                                    <span>Show History ({items.length - 1})</span>
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
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
                                          <TableCell>{new Date(it.createdAt).toLocaleString()}</TableCell>
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
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )}
                        </div>
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
                    <label className="text-sm text-muted-foreground">Current Password</label>
                    <input
                      type="password"
                      className="mt-1 w-full border rounded-md p-2"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">New Password</label>
                    <input
                      type="password"
                      className="mt-1 w-full border rounded-md p-2"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Confirm New Password</label>
                    <input
                      type="password"
                      className="mt-1 w-full border rounded-md p-2"
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
                    className="gap-2"
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