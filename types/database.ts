export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      athlete_links: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          linked_user_id: string
          permission: Database["public"]["Enums"]["link_permission"]
          relationship: Database["public"]["Enums"]["link_relationship"]
          status: Database["public"]["Enums"]["link_status"]
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          linked_user_id: string
          permission?: Database["public"]["Enums"]["link_permission"]
          relationship: Database["public"]["Enums"]["link_relationship"]
          status?: Database["public"]["Enums"]["link_status"]
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          linked_user_id?: string
          permission?: Database["public"]["Enums"]["link_permission"]
          relationship?: Database["public"]["Enums"]["link_relationship"]
          status?: Database["public"]["Enums"]["link_status"]
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_links_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          created_at: string
          grad_year: number | null
          handicap_index: number | null
          home_course: string | null
          id: string
          level: Database["public"]["Enums"]["athlete_level"]
          school: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          grad_year?: number | null
          handicap_index?: number | null
          home_course?: string | null
          id?: string
          level?: Database["public"]["Enums"]["athlete_level"]
          school?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          grad_year?: number | null
          handicap_index?: number | null
          home_course?: string | null
          id?: string
          level?: Database["public"]["Enums"]["athlete_level"]
          school?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          display_name: string
          id: string
          role: Database["public"]["Enums"]["profile_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          id: string
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_athlete: {
        Args: { target_athlete_id: string }
        Returns: boolean
      }
      can_write_athlete: {
        Args: { target_athlete_id: string }
        Returns: boolean
      }
      is_athlete_owner: {
        Args: { target_athlete_id: string }
        Returns: boolean
      }
    }
    Enums: {
      athlete_level: "junior" | "high_school" | "college"
      event_priority: "priority" | "optional" | "stretch" | "backup" | "low"
      event_status: "not_registered" | "registered" | "played" | "skipped"
      homework_status: "yes" | "partly" | "no"
      link_permission: "read" | "write"
      link_relationship: "parent" | "coach"
      link_status: "pending" | "accepted" | "declined" | "revoked" | "expired"
      profile_role: "athlete" | "parent" | "coach"
      round_type:
        | "tournament"
        | "practice_round"
        | "simulated_tournament"
        | "nine_hole"
      session_type:
        | "range_full_swing"
        | "range_wedges"
        | "short_game"
        | "putting"
        | "on_course"
        | "gym"
        | "lesson"
      workout_part:
        | "warmup"
        | "power"
        | "strength"
        | "core"
        | "mobility"
        | "cooldown"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      athlete_level: ["junior", "high_school", "college"],
      event_priority: ["priority", "optional", "stretch", "backup", "low"],
      event_status: ["not_registered", "registered", "played", "skipped"],
      homework_status: ["yes", "partly", "no"],
      link_permission: ["read", "write"],
      link_relationship: ["parent", "coach"],
      link_status: ["pending", "accepted", "declined", "revoked", "expired"],
      profile_role: ["athlete", "parent", "coach"],
      round_type: [
        "tournament",
        "practice_round",
        "simulated_tournament",
        "nine_hole",
      ],
      session_type: [
        "range_full_swing",
        "range_wedges",
        "short_game",
        "putting",
        "on_course",
        "gym",
        "lesson",
      ],
      workout_part: [
        "warmup",
        "power",
        "strength",
        "core",
        "mobility",
        "cooldown",
      ],
    },
  },
} as const

