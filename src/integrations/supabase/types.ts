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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          after_value: Json | null
          before_value: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      capa_actions: {
        Row: {
          capa_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          owner_id: string
          status: Database["public"]["Enums"]["capa_action_status"]
          updated_at: string
        }
        Insert: {
          capa_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["capa_action_status"]
          updated_at?: string
        }
        Update: {
          capa_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["capa_action_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capa_actions_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "capas"
            referencedColumns: ["id"]
          },
        ]
      }
      capas: {
        Row: {
          action_plan: string | null
          capa_number: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          effectiveness_criteria: string | null
          effectiveness_result: string | null
          id: string
          linked_document_id: string | null
          opened_at: string
          owner_id: string
          root_cause: string | null
          severity: Database["public"]["Enums"]["capa_severity"]
          source: Database["public"]["Enums"]["capa_source"]
          source_reference: string | null
          status: Database["public"]["Enums"]["capa_status"]
          title: string
          type: Database["public"]["Enums"]["capa_type"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_plan?: string | null
          capa_number: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          effectiveness_criteria?: string | null
          effectiveness_result?: string | null
          id?: string
          linked_document_id?: string | null
          opened_at?: string
          owner_id: string
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["capa_severity"]
          source?: Database["public"]["Enums"]["capa_source"]
          source_reference?: string | null
          status?: Database["public"]["Enums"]["capa_status"]
          title: string
          type?: Database["public"]["Enums"]["capa_type"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_plan?: string | null
          capa_number?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          effectiveness_criteria?: string | null
          effectiveness_result?: string | null
          id?: string
          linked_document_id?: string | null
          opened_at?: string
          owner_id?: string
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["capa_severity"]
          source?: Database["public"]["Enums"]["capa_source"]
          source_reference?: string | null
          status?: Database["public"]["Enums"]["capa_status"]
          title?: string
          type?: Database["public"]["Enums"]["capa_type"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capas_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_fields: {
        Row: {
          created_at: string
          description: string | null
          field_type: Database["public"]["Enums"]["checklist_field_type"]
          id: string
          is_default: boolean
          label: string
          options: Json | null
          required: boolean
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          field_type?: Database["public"]["Enums"]["checklist_field_type"]
          id?: string
          is_default?: boolean
          label: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          field_type?: Database["public"]["Enums"]["checklist_field_type"]
          id?: string
          is_default?: boolean
          label?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_submissions: {
        Row: {
          answers: Json
          created_at: string
          created_by: string
          id: string
          status: string
          submitted_at: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          created_by: string
          id?: string
          status?: string
          submitted_at?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          submitted_at?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_approvals: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          action_at: string | null
          approver_id: string
          comments: string | null
          created_at: string
          document_id: string
          id: string
          version: number
        }
        Insert: {
          action?: Database["public"]["Enums"]["approval_action"]
          action_at?: string | null
          approver_id: string
          comments?: string | null
          created_at?: string
          document_id: string
          id?: string
          version: number
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          action_at?: string | null
          approver_id?: string
          comments?: string | null
          created_at?: string
          document_id?: string
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_summary: string | null
          document_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          document_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by: string
          version: number
        }
        Update: {
          change_summary?: string | null
          document_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["doc_category"]
          created_at: string
          created_by: string
          current_file_name: string | null
          current_file_path: string | null
          current_file_size: number | null
          current_version: number
          department: string | null
          description: string | null
          doc_number: string
          effective_date: string | null
          expiry_date: string | null
          id: string
          owner_id: string
          review_date: string | null
          status: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["doc_category"]
          created_at?: string
          created_by: string
          current_file_name?: string | null
          current_file_path?: string | null
          current_file_size?: number | null
          current_version?: number
          department?: string | null
          description?: string | null
          doc_number: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          owner_id: string
          review_date?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["doc_category"]
          created_at?: string
          created_by?: string
          current_file_name?: string | null
          current_file_path?: string | null
          current_file_size?: number | null
          current_version?: number
          department?: string | null
          description?: string | null
          doc_number?: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          owner_id?: string
          review_date?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          affected_department: string | null
          affected_process: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          current_status: Database["public"]["Enums"]["risk_status"]
          description: string
          existing_controls: string | null
          id: string
          impact_area: string | null
          linked_capa_id: string | null
          mitigation_status: Database["public"]["Enums"]["risk_mitigation_status"]
          nc_id: string | null
          opened_at: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_number: string
          risk_owner_id: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          affected_department?: string | null
          affected_process?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          current_status?: Database["public"]["Enums"]["risk_status"]
          description: string
          existing_controls?: string | null
          id?: string
          impact_area?: string | null
          linked_capa_id?: string | null
          mitigation_status?: Database["public"]["Enums"]["risk_mitigation_status"]
          nc_id?: string | null
          opened_at?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_number: string
          risk_owner_id: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          affected_department?: string | null
          affected_process?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          current_status?: Database["public"]["Enums"]["risk_status"]
          description?: string
          existing_controls?: string | null
          id?: string
          impact_area?: string | null
          linked_capa_id?: string | null
          mitigation_status?: Database["public"]["Enums"]["risk_mitigation_status"]
          nc_id?: string | null
          opened_at?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_number?: string
          risk_owner_id?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_linked_capa_id_fkey"
            columns: ["linked_capa_id"]
            isOneToOne: false
            referencedRelation: "capas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
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
      app_role: "super_admin" | "admin" | "auditor" | "employee"
      approval_action: "pending" | "approved" | "rejected"
      capa_action_status: "pending" | "in_progress" | "done" | "blocked"
      capa_severity: "low" | "medium" | "high" | "critical"
      capa_source: "audit" | "complaint" | "deviation" | "internal" | "other"
      capa_status:
        | "open"
        | "in_progress"
        | "pending_verification"
        | "closed"
        | "cancelled"
      capa_type: "corrective" | "preventive"
      checklist_field_type:
        | "text"
        | "textarea"
        | "number"
        | "date"
        | "select"
        | "multiselect"
        | "checkbox"
      doc_category:
        | "policy"
        | "sop"
        | "work_instruction"
        | "form"
        | "manual"
        | "record"
      doc_status: "draft" | "in_review" | "approved" | "obsolete" | "rejected"
      risk_level: "low" | "medium" | "high" | "critical"
      risk_mitigation_status:
        | "not_started"
        | "in_progress"
        | "implemented"
        | "verified_effective"
      risk_status: "open" | "mitigated" | "closed" | "accepted"
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
      app_role: ["super_admin", "admin", "auditor", "employee"],
      approval_action: ["pending", "approved", "rejected"],
      capa_action_status: ["pending", "in_progress", "done", "blocked"],
      capa_severity: ["low", "medium", "high", "critical"],
      capa_source: ["audit", "complaint", "deviation", "internal", "other"],
      capa_status: [
        "open",
        "in_progress",
        "pending_verification",
        "closed",
        "cancelled",
      ],
      capa_type: ["corrective", "preventive"],
      checklist_field_type: [
        "text",
        "textarea",
        "number",
        "date",
        "select",
        "multiselect",
        "checkbox",
      ],
      doc_category: [
        "policy",
        "sop",
        "work_instruction",
        "form",
        "manual",
        "record",
      ],
      doc_status: ["draft", "in_review", "approved", "obsolete", "rejected"],
      risk_level: ["low", "medium", "high", "critical"],
      risk_mitigation_status: [
        "not_started",
        "in_progress",
        "implemented",
        "verified_effective",
      ],
      risk_status: ["open", "mitigated", "closed", "accepted"],
    },
  },
} as const
