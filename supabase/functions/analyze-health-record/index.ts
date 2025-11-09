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

    const { filePath } = await req.json();

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('health-records')
      .download(filePath);

    if (downloadError) throw downloadError;

    // Convert PDF to base64 (chunked to avoid stack overflow)
    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    // Call Lovable AI Gateway to extract medical parameters
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the following medical parameters from this health record. Return ONLY valid JSON with these exact fields: age (integer), gender (string: "Male" or "Female"), total_bilirubin, direct_bilirubin, alkaline_phosphotase, sgpt_alamine, sgot_aspartate, total_proteins, albumin, ag_ratio. All numeric values should be numbers. If a value is not found, use null. Format: {"age": number, "gender": "Male/Female", "total_bilirubin": number, ...}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
    });

    const aiResult = await aiResponse.json();
    const medicalParams = JSON.parse(aiResult.choices[0].message.content);

    // Calculate Liver Risk Score (LRS) using the provided algorithm
    const calculateLRS = (params: any) => {
      // Normalization ranges (based on typical medical ranges)
      const normalize = (value: number, min: number, max: number) => {
        if (value === null || value === undefined) return 0;
        return Math.min(Math.max((value - min) / (max - min), 0), 1);
      };

      const TB_norm = normalize(params.total_bilirubin || 0, 0, 20);
      const DB_norm = normalize(params.direct_bilirubin || 0, 0, 10);
      const ALP_norm = normalize(params.alkaline_phosphotase || 0, 40, 500);
      const SGPT_norm = normalize(params.sgpt_alamine || 0, 0, 200);
      const SGOT_norm = normalize(params.sgot_aspartate || 0, 0, 200);
      const TP_norm = normalize(params.total_proteins || 0, 6, 8.5);
      const ALB_norm = normalize(params.albumin || 0, 3.5, 5.5);
      const AGR_norm = normalize(params.ag_ratio || 0, 1, 2.5);
      const AGE_norm = normalize(params.age || 0, 0, 100);
      const Gender_Boost = params.gender === 'Male' ? 0.05 : 0;

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

      // Convert to 0-100 scale
      return Math.round(LRS * 100);
    };

    const liverRiskScore = calculateLRS(medicalParams);
    
    // Generate findings based on parameters
    const findings = [];
    if (medicalParams.total_bilirubin > 1.2) findings.push('Elevated Total Bilirubin');
    if (medicalParams.sgpt_alamine > 40) findings.push('Elevated SGPT levels');
    if (medicalParams.sgot_aspartate > 40) findings.push('Elevated SGOT levels');
    if (medicalParams.albumin < 3.5) findings.push('Low Albumin levels');
    if (findings.length === 0) findings.push('All parameters within normal range');

    const analysis = {
      score: liverRiskScore,
      findings,
      medicalParams
    };

    // Update the health record with analysis and medical parameters
    const { error: updateError } = await supabaseClient
      .from('health_records')
      .update({
        health_score: analysis.score,
        liver_risk_score: liverRiskScore,
        age: medicalParams.age,
        gender: medicalParams.gender,
        total_bilirubin: medicalParams.total_bilirubin,
        direct_bilirubin: medicalParams.direct_bilirubin,
        alkaline_phosphotase: medicalParams.alkaline_phosphotase,
        sgpt_alamine: medicalParams.sgpt_alamine,
        sgot_aspartate: medicalParams.sgot_aspartate,
        total_proteins: medicalParams.total_proteins,
        albumin: medicalParams.albumin,
        ag_ratio: medicalParams.ag_ratio,
        analysis_status: 'completed',
        analysis_result: analysis,
        processed_at: new Date().toISOString()
      })
      .eq('file_path', filePath);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, score: analysis.score }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing health record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
