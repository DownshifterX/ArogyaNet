import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (score) => {
    if (score < 0.3) return { label: "Low", variant: "success" };
    if (score < 0.6) return { label: "Medium", variant: "warning" };
    return { label: "High", variant: "destructive" };
  };

  if (loading) {
    return <div>Loading patients...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Patient Database ({patients.length} records)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>LRS</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Total Bilirubin</TableHead>
                <TableHead>SGPT</TableHead>
                <TableHead>SGOT</TableHead>
                <TableHead>Albumin</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => {
                const risk = getRiskLevel(patient.liver_risk_score);
                return (
                  <TableRow key={patient.id}>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>{patient.gender}</TableCell>
                    <TableCell>{patient.liver_risk_score?.toFixed(4)}</TableCell>
                    <TableCell>
                      <Badge variant={risk.variant}>{risk.label}</Badge>
                    </TableCell>
                    <TableCell>{patient.total_bilirubin}</TableCell>
                    <TableCell>{patient.sgpt_alamine}</TableCell>
                    <TableCell>{patient.sgot_aspartate}</TableCell>
                    <TableCell>{patient.albumin}</TableCell>
                    <TableCell>
                      <Badge variant={patient.result === 1 ? "destructive" : "default"}>
                        {patient.result === 1 ? "Liver Disease" : "Normal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientList;