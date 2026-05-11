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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          intent: string | null
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          intent?: string | null
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          intent?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          profile_id: string | null
          status: string
          ticket_id: string | null
          updated_at: string
          user_email: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      disposable_email_domains: {
        Row: {
          domain: string
        }
        Insert: {
          domain: string
        }
        Update: {
          domain?: string
        }
        Relationships: []
      }
      dispute_messages: {
        Row: {
          content: string
          created_at: string
          dispute_id: string
          id: string
          sender_profile_id: string
        }
        Insert: {
          content: string
          created_at?: string
          dispute_id: string
          id?: string
          sender_profile_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dispute_id?: string
          id?: string
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          initiator_profile_id: string
          listing_id: string | null
          mediator_profile_id: string | null
          reason: string
          resolution: string | null
          resolution_outcome: string | null
          resolved_at: string | null
          responder_profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          initiator_profile_id: string
          listing_id?: string | null
          mediator_profile_id?: string | null
          reason: string
          resolution?: string | null
          resolution_outcome?: string | null
          resolved_at?: string | null
          responder_profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          initiator_profile_id?: string
          listing_id?: string | null
          mediator_profile_id?: string | null
          reason?: string
          resolution?: string | null
          resolution_outcome?: string | null
          resolved_at?: string | null
          responder_profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_initiator_profile_id_fkey"
            columns: ["initiator_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_mediator_profile_id_fkey"
            columns: ["mediator_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_responder_profile_id_fkey"
            columns: ["responder_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category_id: number | null
          condition: string | null
          county_id: number | null
          created_at: string
          description: string
          id: string
          price_estimate: string | null
          profile_id: string
          search_vector: unknown
          status: string
          title: string
          trade_terms: string | null
          updated_at: string
        }
        Insert: {
          category_id?: number | null
          condition?: string | null
          county_id?: number | null
          created_at?: string
          description: string
          id?: string
          price_estimate?: string | null
          profile_id: string
          search_vector?: unknown
          status?: string
          title: string
          trade_terms?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: number | null
          condition?: string | null
          county_id?: number | null
          created_at?: string
          description?: string
          id?: string
          price_estimate?: string | null
          profile_id?: string
          search_vector?: unknown
          status?: string
          title?: string
          trade_terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_profile_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_profile_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_email_notifications: {
        Row: {
          id: string
          message_id: string
          conversation_id: string
          recipient_profile_id: string
          sender_profile_id: string
          status: string
          sent_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          conversation_id: string
          recipient_profile_id: string
          sender_profile_id: string
          status?: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          conversation_id?: string
          recipient_profile_id?: string
          sender_profile_id?: string
          status?: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_email_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_email_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_email_notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_email_notifications_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepting_contact: boolean
          availability: string | null
          avatar_url: string | null
          banned: boolean
          bio: string | null
          category_id: number | null
          county_id: number | null
          created_at: string
          display_name: string | null
          founding_member: boolean
          id: string
          is_published: boolean
          onboarding_completed_at: string | null
          owner_id: string
          rating_avg: number | null
          rating_count: number
          search_text: string | null
          search_vector: unknown
          tiktok_handle: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          accepting_contact?: boolean
          availability?: string | null
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          category_id?: number | null
          county_id?: number | null
          created_at?: string
          display_name?: string | null
          founding_member?: boolean
          id?: string
          is_published?: boolean
          onboarding_completed_at?: string | null
          owner_id: string
          rating_avg?: number | null
          rating_count?: number
          search_text?: string | null
          search_vector?: unknown
          tiktok_handle?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          accepting_contact?: boolean
          availability?: string | null
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          category_id?: number | null
          county_id?: number | null
          created_at?: string
          display_name?: string | null
          founding_member?: boolean
          id?: string
          is_published?: boolean
          onboarding_completed_at?: string | null
          owner_id?: string
          rating_avg?: number | null
          rating_count?: number
          search_text?: string | null
          search_vector?: unknown
          tiktok_handle?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          ratee_profile_id: string
          rater_profile_id: string
          review_text: string | null
          score: number
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          ratee_profile_id: string
          rater_profile_id: string
          review_text?: string | null
          score: number
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          ratee_profile_id?: string
          rater_profile_id?: string
          review_text?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_profile_id_fkey"
            columns: ["ratee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_profile_id_fkey"
            columns: ["rater_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string
          status: string
          target_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          reporter_id: string
          status?: string
          target_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id?: string
          status?: string
          target_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_attempts: {
        Row: {
          count: number
          created_at: string
          day: string
          ip: string
        }
        Insert: {
          count?: number
          created_at?: string
          day?: string
          ip: string
        }
        Update: {
          count?: number
          created_at?: string
          day?: string
          ip?: string
        }
        Relationships: []
      }
      skills_offered: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          skill_text: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          skill_text: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          skill_text?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "skills_offered_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_wanted: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          skill_text: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          skill_text: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          skill_text?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "skills_wanted_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean
          sender_profile_id: string | null
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_profile_id?: string | null
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_profile_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          profile_id: string | null
          source: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          profile_id?: string | null
          source?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          profile_id?: string | null
          source?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_signup_ip: { Args: { p_ip: string }; Returns: boolean }
      contact_eligibility: {
        Args: { p_recipient_profile_id: string; p_sender_owner_id: string }
        Returns: {
          accepting_contact: boolean
          blocked_by_recipient: boolean
          blocked_by_sender: boolean
          recipient_banned: boolean
          recipient_category_id: number
          recipient_county_id: number
          recipient_display_name: string
          recipient_email: string
          recipient_owner_id: string
          recipient_username: string
          sender_banned: boolean
          sender_display_name: string
          sender_profile_id: string
          sender_username: string
        }[]
      }
      current_user_is_verified: { Args: never; Returns: boolean }
      dispute_alert_payload: { Args: { p_dispute_id: string }; Returns: Json }
      find_conversation_between: {
        Args: { p_profile_a: string; p_profile_b: string }
        Returns: {
          id: string
        }[]
      }
      message_alert_payload: { Args: { p_message_id: string }; Returns: Json }
      profile_owner_email: { Args: { p_profile_id: string }; Returns: string }
      refresh_profile_search_text: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      search_listings: {
        Args: {
          p_category_id?: number
          p_condition?: string
          p_county_id?: number
          p_page?: number
          p_page_size?: number
          p_query: string
        }
        Returns: {
          category_id: number
          condition: string
          county_id: number
          created_at: string
          description: string
          id: string
          price_estimate: string
          profile_id: string
          rank: number
          status: string
          title: string
          trade_terms: string
        }[]
      }
      search_listings_count: {
        Args: {
          p_category_id?: number
          p_condition?: string
          p_county_id?: number
          p_query: string
        }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      ticket_alert_payload: { Args: { p_ticket_id: string }; Returns: Json }
      update_webhook_secret: { Args: never; Returns: undefined }
      utc_day: { Args: { ts: string }; Returns: string }
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
