import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

const PatientImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          // Map Excel columns to database fields
          const patients = jsonData.map(row => ({
            age: row['Age of the patient'] || null,
            gender: row['Gender of the patient'] || null,
            total_bilirubin: row['Total Bilirubin'] || null,
            direct_bilirubin: row['Direct Bilirubin'] || null,
            alkaline_phosphotase: row['Alkphos Alkaline Phosphotase'] || null,
            sgpt_alamine: row['Sgpt Alamine Aminotransferase'] || null,
            sgot_aspartate: row['Sgot Aspartate Aminotransferase'] || null,
            total_proteins: row['Total Protiens'] || null,
            albumin: row['ALB Albumin'] || null,
            ag_ratio: row['A/G Ratio Albumin and Globulin Ratio'] || null,
            result: row['Result'] || null
          }));

          // Call edge function to import with LRS calculation
          const { data: result, error } = await supabase.functions.invoke('import-patients', {
            body: { patients }
          });

          if (error) throw error;

          toast({
            title: "Import Successful",
            description: `Imported ${result.imported} patients with calculated risk scores`,
          });
        } catch (error) {
          console.error('Import error:', error);
          toast({
            title: "Import Failed",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Import Patient Database
        </CardTitle>
        <CardDescription>
          Upload the patient dataset Excel file to calculate and store liver risk scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload Liver_Patient_Dataset_LPD_train.csv.xlsx
            </p>
            <Button
              disabled={isImporting}
              onClick={() => document.getElementById('file-upload').click()}
            >
              {isImporting ? "Importing..." : "Select File"}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>This will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Import all patient records from the dataset</li>
              <li>Calculate Liver Risk Score (LRS) for each patient</li>
              <li>Store data in the patients table for analysis</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientImport;