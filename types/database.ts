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
          consent_status: Database["public"]["Enums"]["consent_status"]
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
          consent_status?: Database["public"]["Enums"]["consent_status"]
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
          consent_status?: Database["public"]["Enums"]["consent_status"]
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
      events: {
        Row: {
          athlete_id: string
          city: string | null
          course: string | null
          created_at: string
          entry_fee_cents: number | null
          holes: number
          id: string
          name: string
          notes: string | null
          plays_on: string
          priority: Database["public"]["Enums"]["event_priority"]
          status: Database["public"]["Enums"]["event_status"]
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          city?: string | null
          course?: string | null
          created_at?: string
          entry_fee_cents?: number | null
          holes?: number
          id?: string
          name: string
          notes?: string | null
          plays_on: string
          priority?: Database["public"]["Enums"]["event_priority"]
          status?: Database["public"]["Enums"]["event_status"]
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          city?: string | null
          course?: string | null
          created_at?: string
          entry_fee_cents?: number | null
          holes?: number
          id?: string
          name?: string
          notes?: string | null
          plays_on?: string
          priority?: Database["public"]["Enums"]["event_priority"]
          status?: Database["public"]["Enums"]["event_status"]
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          athlete_id: string
          baseline_value: number | null
          created_at: string
          deadline: string | null
          id: string
          metric: string
          season: string
          target_value: number
          updated_at: string | null
          why: string | null
        }
        Insert: {
          athlete_id: string
          baseline_value?: number | null
          created_at?: string
          deadline?: string | null
          id?: string
          metric: string
          season: string
          target_value: number
          updated_at?: string | null
          why?: string | null
        }
        Update: {
          athlete_id?: string
          baseline_value?: number | null
          created_at?: string
          deadline?: string | null
          id?: string
          metric?: string
          season?: string
          target_value?: number
          updated_at?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_consent_requests: {
        Row: {
          athlete_id: string
          created_at: string
          guardian_email: string
          id: string
          token: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          guardian_email: string
          id?: string
          token?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          guardian_email?: string
          id?: string
          token?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_consent_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      leaks: {
        Row: {
          athlete_id: string
          created_at: string
          current_high: number
          current_low: number
          goal_id: string
          id: string
          name: string
          strokes_saved: number
          target_value: number
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          current_high: number
          current_low: number
          goal_id: string
          id?: string
          name: string
          strokes_saved: number
          target_value: number
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          current_high?: number
          current_low?: number
          goal_id?: string
          id?: string
          name?: string
          strokes_saved?: number
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaks_goal_id_athlete_id_fkey"
            columns: ["goal_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
      }
      lessons: {
        Row: {
          athlete_id: string
          coach_name: string | null
          coach_user_id: string | null
          cost_cents: number | null
          created_at: string
          drill_assigned: string | null
          homework_done: Database["public"]["Enums"]["homework_status"] | null
          homework_target: string | null
          id: string
          occurred_on: string
          swing_key: string | null
          updated_at: string | null
          what_changed: string | null
        }
        Insert: {
          athlete_id: string
          coach_name?: string | null
          coach_user_id?: string | null
          cost_cents?: number | null
          created_at?: string
          drill_assigned?: string | null
          homework_done?: Database["public"]["Enums"]["homework_status"] | null
          homework_target?: string | null
          id?: string
          occurred_on: string
          swing_key?: string | null
          updated_at?: string | null
          what_changed?: string | null
        }
        Update: {
          athlete_id?: string
          coach_name?: string | null
          coach_user_id?: string | null
          cost_cents?: number | null
          created_at?: string
          drill_assigned?: string | null
          homework_done?: Database["public"]["Enums"]["homework_status"] | null
          homework_target?: string | null
          id?: string
          occurred_on?: string
          swing_key?: string | null
          updated_at?: string | null
          what_changed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          athlete_id: string
          created_at: string
          ends_on: string
          id: string
          main_job: string | null
          name: string
          score_target: number | null
          seq: number
          starts_on: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          ends_on: string
          id?: string
          main_job?: string | null
          name: string
          score_target?: number | null
          seq: number
          starts_on: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          ends_on?: string
          id?: string
          main_job?: string | null
          name?: string
          score_target?: number | null
          seq?: number
          starts_on?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phases_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_segments: {
        Row: {
          athlete_id: string
          created_at: string
          drill: string | null
          focus: string | null
          id: string
          minutes: number
          practice_session_id: string
          result: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          drill?: string | null
          focus?: string | null
          id?: string
          minutes: number
          practice_session_id: string
          result?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          drill?: string | null
          focus?: string | null
          id?: string
          minutes?: number
          practice_session_id?: string
          result?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_segments_practice_session_id_athlete_id_fkey"
            columns: ["practice_session_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          notes: string | null
          occurred_on: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_on: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_on?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
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
      rounds: {
        Row: {
          athlete_id: string
          course: string
          created_at: string
          doubles_or_worse: number | null
          event_id: string | null
          fairways_hit: number | null
          fairways_possible: number | null
          greens_in_regulation: number | null
          holes: number
          id: string
          notes: string | null
          par: number
          penalty_strokes: number | null
          played_on: string
          round_type: Database["public"]["Enums"]["round_type"]
          score: number
          three_putts: number | null
          total_putts: number | null
          up_and_downs: number | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          course: string
          created_at?: string
          doubles_or_worse?: number | null
          event_id?: string | null
          fairways_hit?: number | null
          fairways_possible?: number | null
          greens_in_regulation?: number | null
          holes: number
          id?: string
          notes?: string | null
          par: number
          penalty_strokes?: number | null
          played_on: string
          round_type: Database["public"]["Enums"]["round_type"]
          score: number
          three_putts?: number | null
          total_putts?: number | null
          up_and_downs?: number | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          course?: string
          created_at?: string
          doubles_or_worse?: number | null
          event_id?: string | null
          fairways_hit?: number | null
          fairways_possible?: number | null
          greens_in_regulation?: number | null
          holes?: number
          id?: string
          notes?: string | null
          par?: number
          penalty_strokes?: number | null
          played_on?: string
          round_type?: Database["public"]["Enums"]["round_type"]
          score?: number
          three_putts?: number | null
          total_putts?: number | null
          up_and_downs?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string
          entry_fee_cents: number | null
          format: string | null
          id: string
          membership_cost_cents: number | null
          name: string
          org: string | null
          region: string | null
          season: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          entry_fee_cents?: number | null
          format?: string | null
          id?: string
          membership_cost_cents?: number | null
          name: string
          org?: string | null
          region?: string | null
          season?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          entry_fee_cents?: number | null
          format?: string | null
          id?: string
          membership_cost_cents?: number | null
          name?: string
          org?: string | null
          region?: string | null
          season?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      week_templates: {
        Row: {
          activity: string
          athlete_id: string
          created_at: string
          day_of_week: number
          detail: string | null
          id: string
          minutes: number | null
          phase_id: string
          updated_at: string | null
        }
        Insert: {
          activity: string
          athlete_id: string
          created_at?: string
          day_of_week: number
          detail?: string | null
          id?: string
          minutes?: number | null
          phase_id: string
          updated_at?: string | null
        }
        Update: {
          activity?: string
          athlete_id?: string
          created_at?: string
          day_of_week?: number
          detail?: string | null
          id?: string
          minutes?: number | null
          phase_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "week_templates_phase_id_athlete_id_fkey"
            columns: ["phase_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
      }
      workout_blocks: {
        Row: {
          athlete_id: string
          created_at: string
          ends_on: string
          id: string
          minutes_per_session: number | null
          name: string
          sessions_per_week: number | null
          starts_on: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          ends_on: string
          id?: string
          minutes_per_session?: number | null
          name: string
          sessions_per_week?: number | null
          starts_on: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          ends_on?: string
          id?: string
          minutes_per_session?: number | null
          name?: string
          sessions_per_week?: number | null
          starts_on?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_blocks_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          athlete_id: string
          block_id: string
          coaching_note: string | null
          created_at: string
          id: string
          name: string
          part: Database["public"]["Enums"]["workout_part"]
          reps: string | null
          sets: number | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          block_id: string
          coaching_note?: string | null
          created_at?: string
          id?: string
          name: string
          part: Database["public"]["Enums"]["workout_part"]
          reps?: string | null
          sets?: number | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          block_id?: string
          coaching_note?: string | null
          created_at?: string
          id?: string
          name?: string
          part?: Database["public"]["Enums"]["workout_part"]
          reps?: string | null
          sets?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_block_id_athlete_id_fkey"
            columns: ["block_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "workout_blocks"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          athlete_id: string
          created_at: string
          exercise_id: string
          id: string
          load: string | null
          performed_on: string
          reps_done: number | null
          sets_done: number | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          exercise_id: string
          id?: string
          load?: string | null
          performed_on: string
          reps_done?: number | null
          sets_done?: number | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          exercise_id?: string
          id?: string
          load?: string | null
          performed_on?: string
          reps_done?: number | null
          sets_done?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_exercise_id_athlete_id_fkey"
            columns: ["exercise_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
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
      replace_practice_segments: {
        Args: { p_segments: Json; p_session_id: string }
        Returns: undefined
      }
      verify_guardian_consent: {
        Args: { consent_token: string }
        Returns: string
      }
    }
    Enums: {
      athlete_level: "junior" | "high_school" | "college"
      consent_status: "pending_consent" | "active"
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
        | "exercise"
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
      consent_status: ["pending_consent", "active"],
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
        "exercise",
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

