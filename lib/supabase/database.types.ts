export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      supported_currencies: {
        Row: {
          code: string;
          decimal_digits: number;
          is_active: boolean;
          name: string;
          symbol: string;
        };
        Insert: {
          code: string;
          decimal_digits?: number;
          is_active?: boolean;
          name: string;
          symbol: string;
        };
        Update: {
          code?: string;
          decimal_digits?: number;
          is_active?: boolean;
          name?: string;
          symbol?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          created_at: string;
          currency_code: string;
          id: string;
          locale: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency_code?: string;
          id: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency_code?: string;
          id?: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
