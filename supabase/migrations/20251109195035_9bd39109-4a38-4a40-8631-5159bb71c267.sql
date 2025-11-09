-- Add medical parameters to health_records table
ALTER TABLE health_records 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS total_bilirubin DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS direct_bilirubin DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS alkaline_phosphotase DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sgpt_alamine DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sgot_aspartate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_proteins DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS albumin DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ag_ratio DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS liver_risk_score DECIMAL(10,4);

-- Create patients table for imported patient data
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age INTEGER,
  gender TEXT,
  total_bilirubin DECIMAL(10,2),
  direct_bilirubin DECIMAL(10,2),
  alkaline_phosphotase DECIMAL(10,2),
  sgpt_alamine DECIMAL(10,2),
  sgot_aspartate DECIMAL(10,2),
  total_proteins DECIMAL(10,2),
  albumin DECIMAL(10,2),
  ag_ratio DECIMAL(10,2),
  result INTEGER,
  liver_risk_score DECIMAL(10,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Doctors and admins can view all patients
CREATE POLICY "Doctors can view all patients"
ON patients FOR SELECT
USING (has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Admins can view all patients"
ON patients FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert patients (for importing CSV data)
CREATE POLICY "Admins can insert patients"
ON patients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update patients
CREATE POLICY "Admins can update patients"
ON patients FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete patients
CREATE POLICY "Admins can delete patients"
ON patients FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_patients_result ON patients(result);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();