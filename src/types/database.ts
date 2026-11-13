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
export type ToolKey = "clone" | "antidropoff" | "series";

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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
