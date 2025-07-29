export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_chat_customizations: {
        Row: {
          created_at: string
          customization_text: string
          id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          customization_text: string
          id?: string
          room_id: string
        }
        Update: {
          created_at?: string
          customization_text?: string
          id?: string
          room_id?: string
        }
        Relationships: []
      }
      cat_characters: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          perks: string[] | null
          stats: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          perks?: string[] | null
          stats?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          perks?: string[] | null
          stats?: Json
        }
        Relationships: []
      }
      forms_questions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_controversial: boolean | null
          question: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_controversial?: boolean | null
          question: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_controversial?: boolean | null
          question?: string
        }
        Relationships: []
      }
      forms_responses: {
        Row: {
          created_at: string
          id: string
          player_id: string
          question_id: string
          room_id: string
          selected_player_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          question_id: string
          room_id: string
          selected_player_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          question_id?: string
          room_id?: string
          selected_player_id?: string
        }
        Relationships: []
      }
      game_requests: {
        Row: {
          created_at: string
          id: string
          player_id: string
          requested_game: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          requested_game: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          requested_game?: string
          room_id?: string
        }
        Relationships: []
      }
      game_votes: {
        Row: {
          created_at: string
          id: string
          player_id: string
          question_id: string
          room_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          question_id: string
          room_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          question_id?: string
          room_id?: string
          vote?: string
        }
        Relationships: []
      }
      odd_one_out_questions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          options: string[] | null
          question: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          options?: string[] | null
          question: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          options?: string[] | null
          question?: string
        }
        Relationships: []
      }
      paranoia_questions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          question: string
          spiciness_level: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          question: string
          spiciness_level?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          question?: string
          spiciness_level?: number | null
        }
        Relationships: []
      }
      paranoia_rounds: {
        Row: {
          answer: string | null
          asker_player_id: string
          created_at: string
          id: string
          is_revealed: boolean | null
          question: string
          room_id: string
          round_number: number
          target_player_id: string
        }
        Insert: {
          answer?: string | null
          asker_player_id: string
          created_at?: string
          id?: string
          is_revealed?: boolean | null
          question: string
          room_id: string
          round_number: number
          target_player_id: string
        }
        Update: {
          answer?: string | null
          asker_player_id?: string
          created_at?: string
          id?: string
          is_revealed?: boolean | null
          question?: string
          room_id?: string
          round_number?: number
          target_player_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          is_host: boolean | null
          joined_at: string
          player_id: string
          player_name: string
          room_id: string
          selected_character_id: string | null
        }
        Insert: {
          id?: string
          is_host?: boolean | null
          joined_at?: string
          player_id: string
          player_name: string
          room_id: string
          selected_character_id?: string | null
        }
        Update: {
          id?: string
          is_host?: boolean | null
          joined_at?: string
          player_id?: string
          player_name?: string
          room_id?: string
          selected_character_id?: string | null
        }
        Relationships: []
      }
      room_questions: {
        Row: {
          created_at: string
          game_type: string
          id: string
          question_data: Json
          room_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          question_data: Json
          room_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          question_data?: Json
          room_id?: string
        }
        Relationships: []
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
          created_at: string | null
          id: string
          option_a: string
          option_b: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          option_a: string
          option_b: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
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
      create_room_with_host: {
        Args: {
          room_code: string
          room_name: string
          host_player_id: string
          host_player_name: string
          selected_game: string
        }
        Returns: {
          room_id: string
          player_id: string
        }[]
      }
      is_player_in_room: {
        Args: {
          player_uuid: string
        }
        Returns: boolean
      }
      is_room_host: {
        Args: {
          player_uuid: string
        }
        Returns: boolean
      }
      join_room_as_player: {
        Args: {
          room_code: string
          player_uuid: string
          player_name: string
        }
        Returns: {
          room_id: string
          player_id: string
        }[]
      }
      validate_player_name: {
        Args: {
          player_name: string
        }
        Returns: boolean
      }
      validate_room_code: {
        Args: {
          room_code: string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
