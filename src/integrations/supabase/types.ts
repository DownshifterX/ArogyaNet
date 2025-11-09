export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          ag_ratio: number | null
          age: number | null
          albumin: number | null
          alkaline_phosphotase: number | null
          analysis_result: Json | null
          analysis_status: string | null
          direct_bilirubin: number | null
          file_name: string
          file_path: string
          gender: string | null
          health_score: number | null
          id: string
          liver_risk_score: number | null
          processed_at: string | null
          sgot_aspartate: number | null
          sgpt_alamine: number | null
          total_bilirubin: number | null
          total_proteins: number | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          ag_ratio?: number | null
          age?: number | null
          albumin?: number | null
          alkaline_phosphotase?: number | null
          analysis_result?: Json | null
          analysis_status?: string | null
          direct_bilirubin?: number | null
          file_name: string
          file_path: string
          gender?: string | null
          health_score?: number | null
          id?: string
          liver_risk_score?: number | null
          processed_at?: string | null
          sgot_aspartate?: number | null
          sgpt_alamine?: number | null
          total_bilirubin?: number | null
          total_proteins?: number | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          ag_ratio?: number | null
          age?: number | null
          albumin?: number | null
          alkaline_phosphotase?: number | null
          analysis_result?: Json | null
          analysis_status?: string | null
          direct_bilirubin?: number | null
          file_name?: string
          file_path?: string
          gender?: string | null
          health_score?: number | null
          id?: string
          liver_risk_score?: number | null
          processed_at?: string | null
          sgot_aspartate?: number | null
          sgpt_alamine?: number | null
          total_bilirubin?: number | null
          total_proteins?: number | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          ag_ratio: number | null
          age: number | null
          albumin: number | null
          alkaline_phosphotase: number | null
          created_at: string | null
          direct_bilirubin: number | null
          gender: string | null
          id: string
          liver_risk_score: number | null
          result: number | null
          sgot_aspartate: number | null
          sgpt_alamine: number | null
          total_bilirubin: number | null
          total_proteins: number | null
          updated_at: string | null
        }
        Insert: {
          ag_ratio?: number | null
          age?: number | null
          albumin?: number | null
          alkaline_phosphotase?: number | null
          created_at?: string | null
          direct_bilirubin?: number | null
          gender?: string | null
          id?: string
          liver_risk_score?: number | null
          result?: number | null
          sgot_aspartate?: number | null
          sgpt_alamine?: number | null
          total_bilirubin?: number | null
          total_proteins?: number | null
          updated_at?: string | null
        }
        Update: {
          ag_ratio?: number | null
          age?: number | null
          albumin?: number | null
          alkaline_phosphotase?: number | null
          created_at?: string | null
          direct_bilirubin?: number | null
          gender?: string | null
          id?: string
          liver_risk_score?: number | null
          result?: number | null
          sgot_aspartate?: number | null
          sgpt_alamine?: number | null
          total_bilirubin?: number | null
          total_proteins?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          doctor_id: string
          dosage: string
          id: string
          instructions: string | null
          medication: string
          patient_id: string
          prescribed_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          dosage: string
          id?: string
          instructions?: string | null
          medication: string
          patient_id: string
          prescribed_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          dosage?: string
          id?: string
          instructions?: string | null
          medication?: string
          patient_id?: string
          prescribed_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "doctor", "admin"],
    },
  },
} as const
