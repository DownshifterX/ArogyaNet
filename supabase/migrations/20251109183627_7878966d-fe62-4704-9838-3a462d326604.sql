-- Create storage bucket for health records
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-records',
  'health-records',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- Create health_records table
CREATE TABLE public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  health_score INTEGER,
  analysis_status TEXT DEFAULT 'pending',
  analysis_result JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own health records"
  ON public.health_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own health records"
  ON public.health_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can view all health records"
  ON public.health_records FOR SELECT
  USING (has_role(auth.uid(), 'doctor'));

CREATE POLICY "Admins can view all health records"
  ON public.health_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Storage policies for health-records bucket
CREATE POLICY "Users can upload their own health records"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'health-records' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own health records"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'health-records' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Doctors can view all health records"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'health-records' AND
    has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Admins can view all health records"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'health-records' AND
    has_role(auth.uid(), 'admin')
  );