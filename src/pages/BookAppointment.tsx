import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, User, FileText, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Doctor {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

const BookAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    doctor_id: "",
    appointment_time: "",
    notes: "",
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    const { data: doctorRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "doctor");

    if (doctorRoles) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", doctorRoles.map(d => d.user_id));
      
      setDoctors(profiles || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      toast({
        title: "Date Required",
        description: "Please select an appointment date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("appointments").insert({
        patient_id: user!.id,
        doctor_id: formData.doctor_id,
        appointment_date: format(date, "yyyy-MM-dd"),
        appointment_time: formData.appointment_time,
        notes: formData.notes,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your appointment has been booked successfully!",
      });
      navigate("/patient-dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 hover:bg-accent/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent p-8 text-primary-foreground">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-background/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Book an Appointment</h1>
                <p className="text-primary-foreground/80">Schedule your visit with our healthcare professionals</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Doctor Selection */}
            <div className="space-y-3">
              <Label htmlFor="doctor" className="flex items-center gap-2 text-lg font-semibold">
                <User className="w-5 h-5 text-primary" />
                Select Doctor
              </Label>
              <Select
                value={formData.doctor_id}
                onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                required
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Choose your preferred doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.length === 0 ? (
                    <SelectItem value="none" disabled>No doctors available</SelectItem>
                  ) : (
                    doctors.map((doctor) => (
                      <SelectItem key={doctor.user_id} value={doctor.user_id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{doctor.full_name || "Doctor"}</span>
                          {doctor.phone && <span className="text-xs text-muted-foreground">{doctor.phone}</span>}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Date Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-lg font-semibold">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Appointment Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal text-base",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selection */}
              <div className="space-y-3">
                <Label htmlFor="time" className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="w-5 h-5 text-primary" />
                  Appointment Time
                </Label>
                <Select
                  value={formData.appointment_time}
                  onValueChange={(value) => setFormData({ ...formData, appointment_time: value })}
                  required
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason for Visit */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="w-5 h-5 text-primary" />
                Reason for Visit
              </Label>
              <Textarea
                id="notes"
                placeholder="Please describe your symptoms, concerns, or reason for the appointment..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={5}
                className="text-base resize-none"
              />
              <p className="text-sm text-muted-foreground">This helps your doctor prepare for your visit</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 h-12 text-base"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                {loading ? "Booking..." : "Confirm Appointment"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
