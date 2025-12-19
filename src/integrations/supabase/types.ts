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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bases: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          acknowledged_at: string | null
          arrived_at: string | null
          completed_at: string | null
          created_at: string
          dispatched_at: string
          dispatched_by: string
          id: string
          notes: string | null
          occurrence_id: string
          status: Database["public"]["Enums"]["occurrence_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string
          dispatched_by: string
          id?: string
          notes?: string | null
          occurrence_id: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string
          dispatched_by?: string
          id?: string
          notes?: string | null
          occurrence_id?: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrence_history: {
        Row: {
          changed_by: string
          created_at: string
          dispatch_id: string | null
          id: string
          new_status: Database["public"]["Enums"]["occurrence_status"]
          notes: string | null
          occurrence_id: string
          previous_status:
            | Database["public"]["Enums"]["occurrence_status"]
            | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          dispatch_id?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["occurrence_status"]
          notes?: string | null
          occurrence_id: string
          previous_status?:
            | Database["public"]["Enums"]["occurrence_status"]
            | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          dispatch_id?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["occurrence_status"]
          notes?: string | null
          occurrence_id?: string
          previous_status?:
            | Database["public"]["Enums"]["occurrence_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "occurrence_history_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrence_history_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrences: {
        Row: {
          caller_name: string | null
          caller_phone: string | null
          closed_at: string | null
          closed_by: string | null
          code: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          latitude: number | null
          location_address: string | null
          location_reference: string | null
          longitude: number | null
          organization_id: string
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["occurrence_status"]
          title: string
          type: Database["public"]["Enums"]["occurrence_type"]
          updated_at: string
        }
        Insert: {
          caller_name?: string | null
          caller_phone?: string | null
          closed_at?: string | null
          closed_by?: string | null
          code: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          location_reference?: string | null
          longitude?: number | null
          organization_id: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["occurrence_status"]
          title: string
          type: Database["public"]["Enums"]["occurrence_type"]
          updated_at?: string
        }
        Update: {
          caller_name?: string | null
          caller_phone?: string | null
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          location_reference?: string | null
          longitude?: number | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["occurrence_status"]
          title?: string
          type?: Database["public"]["Enums"]["occurrence_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          phone: string | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          badge_number: string | null
          base_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          badge_number?: string | null
          base_id?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          badge_number?: string | null
          base_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          base_id: string
          capacity: number | null
          created_at: string
          id: string
          identifier: string
          status: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at: string
        }
        Insert: {
          base_id: string
          capacity?: number | null
          created_at?: string
          id?: string
          identifier: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at?: string
        }
        Update: {
          base_id?: string
          capacity?: number | null
          created_at?: string
          id?: string
          identifier?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "dispatcher_police"
        | "police_officer"
        | "dispatcher_samu"
        | "samu_team"
        | "dispatcher_fire"
        | "firefighter"
        | "observer"
      occurrence_status:
        | "pending"
        | "dispatched"
        | "en_route"
        | "on_scene"
        | "transporting"
        | "completed"
        | "cancelled"
      occurrence_type: "police" | "medical" | "fire" | "rescue" | "other"
      organization_type: "police" | "samu" | "fire"
      priority_level: "low" | "medium" | "high" | "critical"
      vehicle_status: "available" | "busy" | "maintenance" | "off_duty"
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
      app_role: [
        "admin",
        "dispatcher_police",
        "police_officer",
        "dispatcher_samu",
        "samu_team",
        "dispatcher_fire",
        "firefighter",
        "observer",
      ],
      occurrence_status: [
        "pending",
        "dispatched",
        "en_route",
        "on_scene",
        "transporting",
        "completed",
        "cancelled",
      ],
      occurrence_type: ["police", "medical", "fire", "rescue", "other"],
      organization_type: ["police", "samu", "fire"],
      priority_level: ["low", "medium", "high", "critical"],
      vehicle_status: ["available", "busy", "maintenance", "off_duty"],
    },
  },
} as const
