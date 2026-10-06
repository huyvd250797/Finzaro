export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: string;
          created_at: string;
          currency_code: string;
          current_balance_minor: number;
          id: string;
          institution_name: string | null;
          is_archived: boolean;
          name: string;
          opening_balance_minor: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_type: string;
          created_at?: string;
          currency_code: string;
          current_balance_minor?: number;
          id?: string;
          institution_name?: string | null;
          is_archived?: boolean;
          name: string;
          opening_balance_minor?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_type?: string;
          created_at?: string;
          currency_code?: string;
          current_balance_minor?: number;
          id?: string;
          institution_name?: string | null;
          is_archived?: boolean;
          name?: string;
          opening_balance_minor?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          }
        ];
      };
      transaction_entries: {
        Row: {
          account_id: string;
          amount_minor: number;
          created_at: string;
          currency_code: string;
          entry_role: string;
          id: string;
          transaction_id: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount_minor: number;
          created_at?: string;
          currency_code: string;
          entry_role: string;
          id?: string;
          transaction_id: string;
          user_id: string;
        };
        Update: {
          account_id?: string;
          amount_minor?: number;
          created_at?: string;
          currency_code?: string;
          entry_role?: string;
          id?: string;
          transaction_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_entries_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "transaction_entries_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          category_label: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          title: string;
          transaction_date: string;
          transaction_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_label?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          title: string;
          transaction_date?: string;
          transaction_type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_label?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          title?: string;
          transaction_date?: string;
          transaction_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
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
    Functions: {
      create_financial_transaction_v004: {
        Args: {
          p_category_label?: string | null;
          p_from_account_id?: string | null;
          p_from_amount_minor?: number | null;
          p_notes?: string | null;
          p_title: string;
          p_to_account_id?: string | null;
          p_to_amount_minor?: number | null;
          p_transaction_date?: string;
          p_transaction_type: string;
        };
        Returns: string;
      };
      delete_financial_transaction_v004: {
        Args: { p_transaction_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
