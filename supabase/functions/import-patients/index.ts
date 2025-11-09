import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { patients } = await req.json();

    // Calculate LRS for each patient
    const calculateLRS = (patient: any) => {
      const normalize = (value: number, min: number, max: number) => {
        if (!value) return 0;
        return Math.min(Math.max((value - min) / (max - min), 0), 1);
      };

      const TB_norm = normalize(patient.total_bilirubin, 0, 20);
      const DB_norm = normalize(patient.direct_bilirubin, 0, 10);
      const ALP_norm = normalize(patient.alkaline_phosphotase, 40, 500);
      const SGPT_norm = normalize(patient.sgpt_alamine, 0, 200);
      const SGOT_norm = normalize(patient.sgot_aspartate, 0, 200);
      const TP_norm = normalize(patient.total_proteins, 6, 8.5);
      const ALB_norm = normalize(patient.albumin, 3.5, 5.5);
      const AGR_norm = normalize(patient.ag_ratio, 1, 2.5);
      const AGE_norm = normalize(patient.age, 0, 100);
      const Gender_Boost = patient.gender === 'Male' ? 0.05 : 0;

      const LRS = (0.18 * TB_norm) +
                   (0.12 * DB_norm) +
                   (0.10 * ALP_norm) +
                   (0.10 * SGPT_norm) +
                   (0.10 * SGOT_norm) +
                   (0.10 * (1 - TP_norm)) +
                   (0.12 * (1 - ALB_norm)) +
                   (0.08 * (1 - AGR_norm)) +
                   (0.06 * AGE_norm) +
                   Gender_Boost;

      return LRS;
    };

    // Process patients in batches
    const patientsWithLRS = patients.map((p: any) => ({
      age: p.age,
      gender: p.gender,
      total_bilirubin: p.total_bilirubin,
      direct_bilirubin: p.direct_bilirubin,
      alkaline_phosphotase: p.alkaline_phosphotase,
      sgpt_alamine: p.sgpt_alamine,
      sgot_aspartate: p.sgot_aspartate,
      total_proteins: p.total_proteins,
      albumin: p.albumin,
      ag_ratio: p.ag_ratio,
      result: p.result,
      liver_risk_score: calculateLRS(p)
    }));

    // Insert patients in batches of 100
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < patientsWithLRS.length; i += batchSize) {
      const batch = patientsWithLRS.slice(i, i + batchSize);
      const { error } = await supabaseClient
        .from('patients')
        .insert(batch);

      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
      imported += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, imported }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing patients:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});