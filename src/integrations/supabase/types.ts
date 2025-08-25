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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      arquivos: {
        Row: {
          created_at: string | null
          diagnostico_id: string | null
          id: string
          nome_arquivo: string
          storage_path: string | null
          tamanho_bytes: number | null
          tipo_mime: string | null
        }
        Insert: {
          created_at?: string | null
          diagnostico_id?: string | null
          id?: string
          nome_arquivo: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo_mime?: string | null
        }
        Update: {
          created_at?: string | null
          diagnostico_id?: string | null
          id?: string
          nome_arquivo?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo_mime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diagnosticos"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_ativo: {
        Row: {
          created_at: string
          id: number
          num: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          num?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          num?: number | null
        }
        Relationships: []
      }
      diagnosticos: {
        Row: {
          alertas_top2: Json | null
          created_at: string | null
          cv_content: string | null
          email: string
          id: string
          job_description: string | null
          json_result_rich: Json | null
          nota_ats: number | null
          pago: boolean | null
          resultado_completo: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alertas_top2?: Json | null
          created_at?: string | null
          cv_content?: string | null
          email: string
          id?: string
          job_description?: string | null
          json_result_rich?: Json | null
          nota_ats?: number | null
          pago?: boolean | null
          resultado_completo?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alertas_top2?: Json | null
          created_at?: string | null
          cv_content?: string | null
          email?: string
          id?: string
          job_description?: string | null
          json_result_rich?: Json | null
          nota_ats?: number | null
          pago?: boolean | null
          resultado_completo?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          created_at: string | null
          diagnostico_id: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          moeda: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
          valor_centavos: number | null
        }
        Insert: {
          created_at?: string | null
          diagnostico_id?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          moeda?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          valor_centavos?: number | null
        }
        Update: {
          created_at?: string | null
          diagnostico_id?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          moeda?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          valor_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diagnosticos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_gratuitos: {
        Row: {
          analises_limite: number
          analises_realizadas: number
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          analises_limite?: number
          analises_realizadas?: number
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          analises_limite?: number
          analises_realizadas?: number
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      usuarios_gratuitos_stats: {
        Row: {
          analises_limite: number | null
          analises_realizadas: number | null
          created_at: string | null
          email_hash: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          analises_limite?: number | null
          analises_realizadas?: number | null
          created_at?: string | null
          email_hash?: never
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          analises_limite?: number | null
          analises_realizadas?: number | null
          created_at?: string | null
          email_hash?: never
          id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
