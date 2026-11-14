/**
 * Types de la base Supabase, alignés sur supabase/migrations/.
 * Pour les régénérer depuis le projet : `supabase gen types typescript`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Plan = "free" | "pro";
export type ToolKey = "clone" | "antidropoff" | "series" | "hooks" | "blueprint";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          plan: Plan;
          billing_provider: string | null;
          billing_customer_id: string | null;
          billing_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          plan?: Plan;
          billing_provider?: string | null;
          billing_customer_id?: string | null;
          billing_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          plan?: Plan;
          billing_provider?: string | null;
          billing_customer_id?: string | null;
          billing_subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      credits: {
        Row: {
          user_id: string;
          balance: number;
          lifetime_used: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          lifetime_used?: number;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          lifetime_used?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      creator_profiles: {
        Row: {
          user_id: string;
          niche: string;
          audience: string;
          tone: string;
          platform: string;
          style_notes: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          niche?: string;
          audience?: string;
          tone?: string;
          platform?: string;
          style_notes?: string;
          updated_at?: string;
        };
        Update: {
          niche?: string;
          audience?: string;
          tone?: string;
          platform?: string;
          style_notes?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pending_upgrades: {
        Row: {
          email: string;
          billing_provider: string;
          billing_customer_id: string | null;
          billing_subscription_id: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          billing_provider: string;
          billing_customer_id?: string | null;
          billing_subscription_id?: string | null;
          created_at?: string;
        };
        Update: {
          billing_provider?: string;
          billing_customer_id?: string | null;
          billing_subscription_id?: string | null;
        };
        Relationships: [];
      };
      saved_scripts: {
        Row: {
          id: string;
          user_id: string;
          tool: ToolKey;
          title: string;
          input: Json;
          output: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tool: ToolKey;
          title: string;
          input: Json;
          output: Json;
          created_at?: string;
        };
        Update: {
          title?: string;
        };
        Relationships: [];
      };
      video_logs: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          platform: "tiktok" | "reels" | "shorts" | "other";
          hook: string;
          published_on: string;
          duration_seconds: number | null;
          views: number;
          likes: number | null;
          comments: number | null;
          avg_watch_pct: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          platform: "tiktok" | "reels" | "shorts" | "other";
          hook?: string;
          published_on?: string;
          duration_seconds?: number | null;
          views: number;
          likes?: number | null;
          comments?: number | null;
          avg_watch_pct?: number | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          platform?: "tiktok" | "reels" | "shorts" | "other";
          hook?: string;
          published_on?: string;
          duration_seconds?: number | null;
          views?: number;
          likes?: number | null;
          comments?: number | null;
          avg_watch_pct?: number | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      consume_credit: {
        Args: { p_user_id: string };
        Returns: number | null;
      };
      refund_credit: {
        Args: { p_user_id: string };
        Returns: number | null;
      };
      spend_own_credit: {
        Args: Record<string, never>;
        Returns: number | null;
      };
      can_add_video_log: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      video_log_limit: {
        Args: Record<string, never>;
        Returns: number;
      };
      handle_whop_webhook: {
        Args: {
          p_webhook_id: string;
          p_timestamp: string;
          p_signatures: string;
          p_body: string;
          p_plan_id?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
