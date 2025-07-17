export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_chat_customizations: {
        Row: {
          created_at: string
          customization_text: string
          id: string
          room_id: string | null
        }
        Insert: {
          created_at?: string
          customization_text: string
          id?: string
          room_id?: string | null
        }
        Update: {
          created_at?: string
          customization_text?: string
          id?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_customizations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["room_code"]
          },
        ]
      }
      forms_questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_controversial: boolean | null
          question: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_controversial?: boolean | null
          question: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_controversial?: boolean | null
          question?: string
        }
        Relationships: []
      }
      forms_responses: {
        Row: {
          id: string
          player_id: string
          question_id: string
          responded_at: string
          room_id: string
          selected_player_id: string
        }
        Insert: {
          id?: string
          player_id: string
          question_id: string
          responded_at?: string
          room_id: string
          selected_player_id: string
        }
        Update: {
          id?: string
          player_id?: string
          question_id?: string
          responded_at?: string
          room_id?: string
          selected_player_id?: string
        }
        Relationships: []
      }
      game_requests: {
        Row: {
          created_at: string
          game_type: string
          id: string
          player_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          player_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          player_id?: string
          room_id?: string
        }
        Relationships: []
      }
      game_votes: {
        Row: {
          id: string
          player_id: string
          question_id: string
          room_id: string
          vote: string
          voted_at: string
        }
        Insert: {
          id?: string
          player_id: string
          question_id: string
          room_id: string
          vote: string
          voted_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          question_id?: string
          room_id?: string
          vote?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "would_you_rather_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      paranoia_questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          question: string
          spiciness_level: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          question: string
          spiciness_level?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          question?: string
          spiciness_level?: number | null
        }
        Relationships: []
      }
      paranoia_rounds: {
        Row: {
          asker_player_id: string
          chosen_player_id: string
          created_at: string
          id: string
          is_revealed: boolean | null
          question_id: string
          room_id: string
          round_number: number
        }
        Insert: {
          asker_player_id: string
          chosen_player_id: string
          created_at?: string
          id?: string
          is_revealed?: boolean | null
          question_id: string
          room_id: string
          round_number: number
        }
        Update: {
          asker_player_id?: string
          chosen_player_id?: string
          created_at?: string
          id?: string
          is_revealed?: boolean | null
          question_id?: string
          room_id?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "paranoia_rounds_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "paranoia_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          id: string
          is_host: boolean | null
          joined_at: string
          player_id: string
          player_name: string
          room_id: string
        }
        Insert: {
          id?: string
          is_host?: boolean | null
          joined_at?: string
          player_id: string
          player_name: string
          room_id: string
        }
        Update: {
          id?: string
          is_host?: boolean | null
          joined_at?: string
          player_id?: string
          player_name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          current_game: string | null
          game_state: Json | null
          host_id: string
          id: string
          is_active: boolean | null
          name: string
          room_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_game?: string | null
          game_state?: Json | null
          host_id: string
          id?: string
          is_active?: boolean | null
          name: string
          room_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_game?: string | null
          game_state?: Json | null
          host_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          room_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      would_you_rather_questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          option_a: string
          option_b: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          option_a: string
          option_b: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          option_a?: string
          option_b?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_player_name: {
        Args: { name: string }
        Returns: boolean
      }
      validate_room_code: {
        Args: { code: string }
        Returns: boolean
      }
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
