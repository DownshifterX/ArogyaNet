# ArogyaNet Backend Documentation

## Overview
This application uses **Lovable Cloud** (powered by Supabase) for all backend functionality including authentication, database, file storage, and serverless functions.

## PDF Storage Configuration

### Current Setup (Cloud-based)
- **Storage Location**: Supabase Storage bucket named `health-records`
- **Path Structure**: `{user_id}/{filename}`
- **Access**: Files are private and require authentication
- **Configuration**: See `supabase/config.toml`

### For Local File Storage (Self-Hosting Required)
To store PDFs locally on your laptop:

1. **Clone the project** and set up local Supabase:
   ```bash
   git clone <your-repo>
   cd arogyanet
   supabase init
   supabase start
   ```

2. **Modify storage configuration** in `supabase/config.toml`:
   ```toml
   [storage]
   file_size_limit = "50MiB"
   
   # Add local path configuration
   [storage.buckets.health-records]
   public = false
   file_size_limit = "50MiB"
   allowed_mime_types = ["application/pdf"]
   ```

3. **Update the HealthRecordsSection.jsx** to use local paths:
   ```javascript
   // Replace Supabase storage upload with local file system
   const formData = new FormData();
   formData.append('file', file);
   
   const response = await fetch('/api/upload-local', {
     method: 'POST',
     body: formData
   });
   ```

4. **Create local upload endpoint** (requires Node.js backend):
   ```javascript
   // server.js
   const express = require('express');
   const multer = require('multer');
   const path = require('path');
   
   const storage = multer.diskStorage({
     destination: (req, file, cb) => {
       // CUSTOMIZE THIS PATH for your laptop
       const uploadPath = 'C:/Users/YourName/Documents/health-records';
       // Or on Mac/Linux: '/Users/YourName/Documents/health-records'
       cb(null, uploadPath);
     },
     filename: (req, file, cb) => {
       cb(null, `${Date.now()}-${file.originalname}`);
     }
   });
   
   const upload = multer({ storage });
   ```

## Health Score Algorithm (LRS)

### Formula
```
LRS = (0.18 × TB_norm) + 
      (0.12 × DB_norm) + 
      (0.10 × ALP_norm) + 
      (0.10 × SGPT_norm) + 
      (0.10 × SGOT_norm) + 
      (0.10 × (1 - TP_norm)) + 
      (0.12 × (1 - ALB_norm)) + 
      (0.08 × (1 - AGR_norm)) + 
      (0.06 × AGE_norm) + 
      Gender_Boost
```

### Parameters
- **TB**: Total Bilirubin (normal: 0-1.2 mg/dL)
- **DB**: Direct Bilirubin (normal: 0-0.3 mg/dL)
- **ALP**: Alkaline Phosphatase (normal: 40-130 U/L)
- **SGPT**: Alanine Aminotransferase (normal: 7-56 U/L)
- **SGOT**: Aspartate Aminotransferase (normal: 10-40 U/L)
- **TP**: Total Proteins (normal: 6-8.5 g/dL)
- **ALB**: Albumin (normal: 3.5-5.5 g/dL)
- **AGR**: Albumin/Globulin Ratio (normal: 1-2.5)
- **AGE**: Age in years
- **Gender_Boost**: 0.05 for Male, 0 for Female

### Normalization
Each parameter is normalized to 0-1 scale based on medical reference ranges.

### Score Interpretation
- **Low Risk**: LRS < 0.3 (Score: 0-30)
- **Medium Risk**: LRS 0.3-0.6 (Score: 30-60)
- **High Risk**: LRS > 0.6 (Score: 60-100)

## Database Schema

### Tables

#### `patients`
Stores patient health records from imported datasets.
```sql
- id: UUID (Primary Key)
- age: INTEGER
- gender: TEXT
- total_bilirubin: DECIMAL(10,2)
- direct_bilirubin: DECIMAL(10,2)
- alkaline_phosphotase: DECIMAL(10,2)
- sgpt_alamine: DECIMAL(10,2)
- sgot_aspartate: DECIMAL(10,2)
- total_proteins: DECIMAL(10,2)
- albumin: DECIMAL(10,2)
- ag_ratio: DECIMAL(10,2)
- result: INTEGER (1=Liver Disease, 2=Normal)
- liver_risk_score: DECIMAL(10,4)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `health_records`
Stores uploaded health records with analysis results.
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- file_name: TEXT
- file_path: TEXT
- age: INTEGER
- gender: TEXT
- (... all medical parameters)
- health_score: INTEGER
- liver_risk_score: DECIMAL(10,4)
- analysis_status: TEXT
- analysis_result: JSONB
- uploaded_at: TIMESTAMP
- processed_at: TIMESTAMP
```

## Edge Functions

### `analyze-health-record`
**Purpose**: Analyzes uploaded health records using Lovable AI and calculates LRS.

**Authentication**: Public (verify_jwt = false)

**Input**:
```json
{
  "filePath": "user_id/filename.pdf"
}
```

**Output**:
```json
{
  "success": true,
  "score": 45
}
```

**Process**:
1. Download PDF from Supabase Storage
2. Convert to base64
3. Send to Lovable AI for parameter extraction
4. Calculate LRS using the formula
5. Update database with results

### `import-patients`
**Purpose**: Imports patient data from Excel and calculates LRS for each record.

**Authentication**: Required (verify_jwt = true)

**Authorization**: Admin role only

**Input**:
```json
{
  "patients": [
    {
      "age": 65,
      "gender": "Female",
      "total_bilirubin": 0.7,
      ...
    }
  ]
}
```

**Output**:
```json
{
  "success": true,
  "imported": 500
}
```

## Authentication & Authorization

### Roles
- **patient**: Can upload own health records, book appointments
- **doctor**: Can view all patients, appointments, prescriptions
- **admin**: Full access including user management and data import

### Role-Based Access Control (RLS)
All tables use Row Level Security policies. Examples:

```sql
-- Patients table
CREATE POLICY "Doctors can view all patients"
ON patients FOR SELECT
USING (has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Admins can insert patients"
ON patients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Patient Data Import

### Process
1. Admin logs in and navigates to Admin Panel → Patients tab
2. Clicks "Upload Medical Records" in navbar or "Select File" in Patients tab
3. Uploads `Liver_Patient_Dataset_LPD_train.csv.xlsx`
4. System:
   - Parses Excel file
   - Maps columns to database fields
   - Calculates LRS for each patient
   - Inserts records in batches of 100
   - Returns import status

### Dataset Format
Excel/CSV file with columns:
- Age of the patient
- Gender of the patient
- Total Bilirubin
- Direct Bilirubin
- Alkphos Alkaline Phosphotase
- Sgpt Alamine Aminotransferase
- Sgot Aspartate Aminotransferase
- Total Protiens
- ALB Albumin
- A/G Ratio Albumin and Globulin Ratio
- Result (1 or 2)

## Security Notes

⚠️ **Current Security Warning**: Leaked password protection is disabled. To enable:

1. Go to Lovable Cloud dashboard
2. Navigate to Authentication settings
3. Enable "Leaked Password Protection"

## API Endpoints

### Frontend Base URL
```
https://kdnjaygncmyobotnldfh.supabase.co
```

### Edge Functions
```
POST /functions/v1/analyze-health-record
POST /functions/v1/import-patients
```

### Storage
```
Bucket: health-records
Path: {user_id}/{filename}
```

## Environment Variables

Already configured in `.env`:
```
VITE_SUPABASE_URL=https://kdnjaygncmyobotnldfh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[auto-configured]
VITE_SUPABASE_PROJECT_ID=kdnjaygncmyobotnldfh
```

## Local Development

### Using Cloud Backend (Recommended)
No additional setup needed. All backend services are provided by Lovable Cloud.

### Self-Hosting (Advanced)
1. Install Supabase CLI
2. Initialize local project
3. Run migrations
4. Update environment variables
5. Configure local storage paths
6. Deploy edge functions locally

For detailed self-hosting instructions, visit:
https://docs.lovable.dev/tips-tricks/self-hosting
