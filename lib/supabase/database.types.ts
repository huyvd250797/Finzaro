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
      budgets: {
        Row: {
          amount_minor: number;
          category_id: string;
          created_at: string;
          currency_code: string;
          id: string;
          is_archived: boolean;
          month_start: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          category_id: string;
          created_at?: string;
          currency_code: string;
          id?: string;
          is_archived?: boolean;
          month_start: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          category_id?: string;
          created_at?: string;
          currency_code?: string;
          id?: string;
          is_archived?: boolean;
          month_start?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgets_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          }
        ];
      };
      categories: {
        Row: {
          category_type: string;
          created_at: string;
          icon_name: string;
          icon_color: string;
          id: string;
          is_archived: boolean;
          is_system: boolean;
          name: string;
          parent_id: string | null;
          sort_order: number;
          system_key: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_type: string;
          created_at?: string;
          icon_name?: string;
          icon_color?: string;
          id?: string;
          is_archived?: boolean;
          is_system?: boolean;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          system_key?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_type?: string;
          created_at?: string;
          icon_name?: string;
          icon_color?: string;
          id?: string;
          is_archived?: boolean;
          is_system?: boolean;
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
          system_key?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_owner_fkey";
            columns: ["parent_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
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
          category_id: string | null;
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
          category_id?: string | null;
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
          category_id?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };

      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: string;
          title: string;
          category_id: string | null;
          from_account_id: string | null;
          to_account_id: string | null;
          from_amount_minor: number | null;
          to_amount_minor: number | null;
          notes: string | null;
          frequency: string;
          interval_count: number;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: string;
          title: string;
          category_id?: string | null;
          from_account_id?: string | null;
          to_account_id?: string | null;
          from_amount_minor?: number | null;
          to_amount_minor?: number | null;
          notes?: string | null;
          frequency: string;
          interval_count?: number;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: string;
          title?: string;
          category_id?: string | null;
          from_account_id?: string | null;
          to_account_id?: string | null;
          from_amount_minor?: number | null;
          to_amount_minor?: number | null;
          notes?: string | null;
          frequency?: string;
          interval_count?: number;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_rules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_rules_from_account_id_fkey";
            columns: ["from_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_rules_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      recurring_occurrences: {
        Row: {
          id: string;
          user_id: string;
          recurring_rule_id: string;
          due_date: string;
          status: string;
          transaction_id: string | null;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recurring_rule_id: string;
          due_date: string;
          status: string;
          transaction_id?: string | null;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recurring_rule_id?: string;
          due_date?: string;
          status?: string;
          transaction_id?: string | null;
          completed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_occurrences_recurring_rule_id_fkey";
            columns: ["recurring_rule_id"];
            isOneToOne: false;
            referencedRelation: "recurring_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_occurrences_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          currency_code: string;
          target_amount_minor: number;
          target_date: string | null;
          linked_account_id: string | null;
          icon_name: string;
          icon_color: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          currency_code: string;
          target_amount_minor: number;
          target_date?: string | null;
          linked_account_id?: string | null;
          icon_name?: string;
          icon_color?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          currency_code?: string;
          target_amount_minor?: number;
          target_date?: string | null;
          linked_account_id?: string | null;
          icon_name?: string;
          icon_color?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_goals_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "savings_goals_linked_account_id_fkey";
            columns: ["linked_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      savings_goal_entries: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          entry_type: string;
          amount_minor: number;
          entry_date: string;
          transaction_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id: string;
          entry_type: string;
          amount_minor: number;
          entry_date?: string;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string;
          entry_type?: string;
          amount_minor?: number;
          entry_date?: string;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_goal_entries_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "savings_goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "savings_goal_entries_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      deposits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          institution_name: string | null;
          currency_code: string;
          principal_minor: number;
          annual_rate_percent: number;
          term_months: number;
          start_date: string;
          maturity_date: string;
          interest_method: string;
          auto_renew: boolean;
          linked_account_id: string | null;
          icon_name: string;
          icon_color: string;
          notes: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          institution_name?: string | null;
          currency_code: string;
          principal_minor: number;
          annual_rate_percent: number;
          term_months: number;
          start_date: string;
          maturity_date: string;
          interest_method?: string;
          auto_renew?: boolean;
          linked_account_id?: string | null;
          icon_name?: string;
          icon_color?: string;
          notes?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          institution_name?: string | null;
          currency_code?: string;
          principal_minor?: number;
          annual_rate_percent?: number;
          term_months?: number;
          start_date?: string;
          maturity_date?: string;
          interest_method?: string;
          auto_renew?: boolean;
          linked_account_id?: string | null;
          icon_name?: string;
          icon_color?: string;
          notes?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deposits_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "deposits_linked_account_id_fkey";
            columns: ["linked_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      deposit_interest_entries: {
        Row: {
          id: string;
          user_id: string;
          deposit_id: string;
          entry_type: string;
          amount_minor: number;
          entry_date: string;
          transaction_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          deposit_id: string;
          entry_type: string;
          amount_minor: number;
          entry_date?: string;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          deposit_id?: string;
          entry_type?: string;
          amount_minor?: number;
          entry_date?: string;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deposit_interest_entries_deposit_id_fkey";
            columns: ["deposit_id"];
            isOneToOne: false;
            referencedRelation: "deposits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deposit_interest_entries_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      loans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          lender_name: string | null;
          currency_code: string;
          original_principal_minor: number;
          annual_rate_percent: number;
          term_months: number;
          start_date: string;
          first_payment_date: string;
          interest_method: string;
          payment_frequency: string;
          upfront_fee_minor: number;
          linked_account_id: string | null;
          icon_name: string;
          icon_color: string;
          notes: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          lender_name?: string | null;
          currency_code: string;
          original_principal_minor: number;
          annual_rate_percent: number;
          term_months: number;
          start_date: string;
          first_payment_date: string;
          interest_method?: string;
          payment_frequency?: string;
          upfront_fee_minor?: number;
          linked_account_id?: string | null;
          icon_name?: string;
          icon_color?: string;
          notes?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          lender_name?: string | null;
          currency_code?: string;
          original_principal_minor?: number;
          annual_rate_percent?: number;
          term_months?: number;
          start_date?: string;
          first_payment_date?: string;
          interest_method?: string;
          payment_frequency?: string;
          upfront_fee_minor?: number;
          linked_account_id?: string | null;
          icon_name?: string;
          icon_color?: string;
          notes?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loans_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "loans_linked_account_id_fkey";
            columns: ["linked_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      loan_payments: {
        Row: {
          id: string;
          user_id: string;
          loan_id: string;
          payment_date: string;
          principal_minor: number;
          interest_minor: number;
          fee_minor: number;
          transaction_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          loan_id: string;
          payment_date?: string;
          principal_minor?: number;
          interest_minor?: number;
          fee_minor?: number;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          loan_id?: string;
          payment_date?: string;
          principal_minor?: number;
          interest_minor?: number;
          fee_minor?: number;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loan_payments_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      financial_health_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          currency_code: string;
          overall_score: number;
          data_confidence: number;
          cashflow_score: number;
          savings_score: number;
          budget_score: number;
          liquidity_score: number;
          debt_score: number;
          credit_score: number;
          net_worth_score: number;
          metrics: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date?: string;
          currency_code: string;
          overall_score: number;
          data_confidence: number;
          cashflow_score: number;
          savings_score: number;
          budget_score: number;
          liquidity_score: number;
          debt_score: number;
          credit_score: number;
          net_worth_score: number;
          metrics?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot_date?: string;
          currency_code?: string;
          overall_score?: number;
          data_confidence?: number;
          cashflow_score?: number;
          savings_score?: number;
          budget_score?: number;
          liquidity_score?: number;
          debt_score?: number;
          credit_score?: number;
          net_worth_score?: number;
          metrics?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_health_snapshots_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          }
        ];
      };
      net_worth_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          currency_code: string;
          account_assets_minor: number;
          deposit_assets_minor: number;
          loan_liabilities_minor: number;
          credit_card_liabilities_minor: number;
          total_assets_minor: number;
          total_liabilities_minor: number;
          net_worth_minor: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date?: string;
          currency_code: string;
          account_assets_minor?: number;
          deposit_assets_minor?: number;
          loan_liabilities_minor?: number;
          credit_card_liabilities_minor?: number;
          total_assets_minor?: number;
          total_liabilities_minor?: number;
          net_worth_minor?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot_date?: string;
          currency_code?: string;
          account_assets_minor?: number;
          deposit_assets_minor?: number;
          loan_liabilities_minor?: number;
          credit_card_liabilities_minor?: number;
          total_assets_minor?: number;
          total_liabilities_minor?: number;
          net_worth_minor?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "net_worth_snapshots_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "supported_currencies";
            referencedColumns: ["code"];
          }
        ];
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

      post_recurring_occurrence_v007: {
        Args: { p_rule_id: string; p_due_date: string; p_status: string };
        Returns: string;
      };
      undo_recurring_occurrence_v007: {
        Args: { p_occurrence_id: string };
        Returns: boolean;
      };
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
      create_financial_transaction_v005: {
        Args: {
          p_category_id?: string | null;
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
      delete_financial_transaction_v005: {
        Args: { p_transaction_id: string };
        Returns: boolean;
      };
      ensure_default_categories_v005: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
