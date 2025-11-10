import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppointmentNotification {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { appointmentId, patientId, doctorId, appointmentDate, appointmentTime, notes }: AppointmentNotification = await req.json();

    console.log('Processing appointment notification:', { appointmentId, patientId, doctorId });

    // Fetch patient details
    const { data: patientProfile, error: patientError } = await supabaseClient
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', patientId)
      .single();

    if (patientError) {
      console.error('Error fetching patient:', patientError);
      throw new Error('Patient not found');
    }

    // Fetch doctor details
    const { data: doctorProfile, error: doctorError } = await supabaseClient
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', doctorId)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor:', doctorError);
      throw new Error('Doctor not found');
    }

    console.log('Appointment booked successfully:', {
      patient: patientProfile.full_name,
      doctor: doctorProfile.full_name,
      date: appointmentDate,
      time: appointmentTime,
    });

    // In a production environment, you would send actual emails/SMS here
    // For now, we'll just log the notification details
    const notificationMessage = {
      patientNotification: {
        to: patientProfile.full_name,
        subject: 'Appointment Confirmation',
        message: `Your appointment with Dr. ${doctorProfile.full_name} has been confirmed for ${appointmentDate} at ${appointmentTime}.`,
      },
      doctorNotification: {
        to: doctorProfile.full_name,
        subject: 'New Appointment',
        message: `New appointment scheduled with ${patientProfile.full_name} on ${appointmentDate} at ${appointmentTime}.${notes ? ` Notes: ${notes}` : ''}`,
      },
    };

    console.log('Notifications prepared:', notificationMessage);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Appointment notification processed',
        notifications: notificationMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing appointment notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
