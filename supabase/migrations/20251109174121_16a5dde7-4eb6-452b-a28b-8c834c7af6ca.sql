-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication TEXT NOT NULL,
  dosage TEXT NOT NULL,
  instructions TEXT,
  prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Patients can view their own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can update their appointments"
ON public.appointments FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Admins can view all appointments"
ON public.appointments FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for prescriptions
CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their prescriptions"
ON public.prescriptions FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Admins can view all prescriptions"
ON public.prescriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();