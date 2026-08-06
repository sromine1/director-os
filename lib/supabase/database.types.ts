// Generated from the local Supabase schema.
// Regenerate with: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      executive_briefs: {
        Row: {
          action_items: string | null;
          body_text: string | null;
          category: string | null;
          client: string | null;
          completed_at: string | null;
          created_at: string;
          deadline: string | null;
          decisions_required: string | null;
          estimated_effort: string | null;
          executive_summary: string | null;
          has_attachments: boolean;
          id: string;
          pinned: boolean;
          priority: string | null;
          raw_ai_output: Json | null;
          received_at: string | null;
          recipients: string | null;
          risks: string | null;
          sender: string | null;
          snooze_until: string | null;
          source_message_id: string | null;
          subject: string | null;
          suggested_reply: string | null;
        };
        Insert: {
          action_items?: string | null;
          body_text?: string | null;
          category?: string | null;
          client?: string | null;
          completed_at?: string | null;
          created_at?: string;
          deadline?: string | null;
          decisions_required?: string | null;
          estimated_effort?: string | null;
          executive_summary?: string | null;
          has_attachments?: boolean;
          id?: string;
          pinned?: boolean;
          priority?: string | null;
          raw_ai_output?: Json | null;
          received_at?: string | null;
          recipients?: string | null;
          risks?: string | null;
          sender?: string | null;
          snooze_until?: string | null;
          source_message_id?: string | null;
          subject?: string | null;
          suggested_reply?: string | null;
        };
        Update: {
          action_items?: string | null;
          body_text?: string | null;
          category?: string | null;
          client?: string | null;
          completed_at?: string | null;
          created_at?: string;
          deadline?: string | null;
          decisions_required?: string | null;
          estimated_effort?: string | null;
          executive_summary?: string | null;
          has_attachments?: boolean;
          id?: string;
          pinned?: boolean;
          priority?: string | null;
          raw_ai_output?: Json | null;
          received_at?: string | null;
          recipients?: string | null;
          risks?: string | null;
          sender?: string | null;
          snooze_until?: string | null;
          source_message_id?: string | null;
          subject?: string | null;
          suggested_reply?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"];

export type TablesInsert<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Insert"];

export type TablesUpdate<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Update"];
