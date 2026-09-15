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
      access_code_redemptions: {
        Row: {
          access_code_id: string | null
          attempted_code_sha256: string
          created_at: string
          id: string
          ip_hash: string | null
          result: string
          user_agent: string | null
          user_entitlement_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_code_id?: string | null
          attempted_code_sha256: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          result: string
          user_agent?: string | null
          user_entitlement_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_code_id?: string | null
          attempted_code_sha256?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          result?: string
          user_agent?: string | null
          user_entitlement_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_code_redemptions_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_code_redemptions_user_entitlement_id_fkey"
            columns: ["user_entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_code_redemptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      access_code_transfers: {
        Row: {
          access_code_id: string
          created_at: string
          from_user_id: string | null
          id: string
          note: string | null
          to_email: string | null
          to_user_id: string | null
        }
        Insert: {
          access_code_id: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          note?: string | null
          to_email?: string | null
          to_user_id?: string | null
        }
        Update: {
          access_code_id?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          note?: string | null
          to_email?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_code_transfers_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          code: string
          code_year: number
          created_at: string
          created_by: string | null
          customer_subscription_id: string | null
          entitlement_duration_days: number | null
          entitlement_product_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          issued_to_email: string | null
          issued_to_user_id: string | null
          last_transferred_at: string | null
          metadata: Json
          order_id: string | null
          order_item_id: string | null
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          redeemed_workspace_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_type: string
          starts_at: string | null
          status: Database["public"]["Enums"]["access_code_status"]
          transfer_count: number
          updated_at: string
        }
        Insert: {
          code: string
          code_year: number
          created_at?: string
          created_by?: string | null
          customer_subscription_id?: string | null
          entitlement_duration_days?: number | null
          entitlement_product_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issued_to_email?: string | null
          issued_to_user_id?: string | null
          last_transferred_at?: string | null
          metadata?: Json
          order_id?: string | null
          order_item_id?: string | null
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          redeemed_workspace_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_type?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["access_code_status"]
          transfer_count?: number
          updated_at?: string
        }
        Update: {
          code?: string
          code_year?: number
          created_at?: string
          created_by?: string | null
          customer_subscription_id?: string | null
          entitlement_duration_days?: number | null
          entitlement_product_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issued_to_email?: string | null
          issued_to_user_id?: string | null
          last_transferred_at?: string | null
          metadata?: Json
          order_id?: string | null
          order_item_id?: string | null
          product_code?: Database["public"]["Enums"]["commerce_product_code"]
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          redeemed_workspace_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_type?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["access_code_status"]
          transfer_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_entitlement_product_id_fkey"
            columns: ["entitlement_product_id"]
            isOneToOne: false
            referencedRelation: "entitlement_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_redeemed_workspace_id_fkey"
            columns: ["redeemed_workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          is_active: boolean
          role: Database["public"]["Enums"]["cms_admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["cms_admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["cms_admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_article_brand_profiles: {
        Row: {
          banned_terms: string[]
          brand_facts: Json
          brand_name: string
          created_at: string
          created_by: string | null
          cta_defaults: Json
          default_locale: string
          default_region: string | null
          id: string
          industry: string | null
          internal_links: Json
          is_default: boolean
          name: string
          preferred_terms: string[]
          target_audience: string | null
          tone: string
          tone_notes: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          banned_terms?: string[]
          brand_facts?: Json
          brand_name: string
          created_at?: string
          created_by?: string | null
          cta_defaults?: Json
          default_locale?: string
          default_region?: string | null
          id?: string
          industry?: string | null
          internal_links?: Json
          is_default?: boolean
          name: string
          preferred_terms?: string[]
          target_audience?: string | null
          tone?: string
          tone_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          banned_terms?: string[]
          brand_facts?: Json
          brand_name?: string
          created_at?: string
          created_by?: string | null
          cta_defaults?: Json
          default_locale?: string
          default_region?: string | null
          id?: string
          industry?: string | null
          internal_links?: Json
          is_default?: boolean
          name?: string
          preferred_terms?: string[]
          target_audience?: string | null
          tone?: string
          tone_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_brand_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_exports: {
        Row: {
          content: string | null
          created_at: string
          error_message: string | null
          exported_by: string | null
          file_size_bytes: number | null
          format: Database["public"]["Enums"]["ai_export_format"]
          id: string
          output_id: string
          status: string
          storage_path: string | null
          target: string
          target_ref: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          exported_by?: string | null
          file_size_bytes?: number | null
          format: Database["public"]["Enums"]["ai_export_format"]
          id?: string
          output_id: string
          status?: string
          storage_path?: string | null
          target?: string
          target_ref?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          exported_by?: string | null
          file_size_bytes?: number | null
          format?: Database["public"]["Enums"]["ai_export_format"]
          id?: string
          output_id?: string
          status?: string
          storage_path?: string | null
          target?: string
          target_ref?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_exports_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "ai_article_generation_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_exports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_generation_outputs: {
        Row: {
          approved_at: string | null
          article_schema_json: Json | null
          banned_terms_found: string[]
          body_html: string | null
          body_markdown: string | null
          created_at: string
          faq: Json
          faq_schema_json: Json | null
          generation_id: string
          h1: string | null
          headings: Json
          id: string
          internal_links: Json
          meta_description: string | null
          project_id: string
          published_at: string | null
          published_url: string | null
          quality_checks: Json
          reviewed_at: string | null
          reviewed_by: string | null
          seo_title: string | null
          slug: string | null
          status: Database["public"]["Enums"]["ai_content_status"]
          updated_at: string
          version: number
          word_count: number | null
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          article_schema_json?: Json | null
          banned_terms_found?: string[]
          body_html?: string | null
          body_markdown?: string | null
          created_at?: string
          faq?: Json
          faq_schema_json?: Json | null
          generation_id: string
          h1?: string | null
          headings?: Json
          id?: string
          internal_links?: Json
          meta_description?: string | null
          project_id: string
          published_at?: string | null
          published_url?: string | null
          quality_checks?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["ai_content_status"]
          updated_at?: string
          version?: number
          word_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          article_schema_json?: Json | null
          banned_terms_found?: string[]
          body_html?: string | null
          body_markdown?: string | null
          created_at?: string
          faq?: Json
          faq_schema_json?: Json | null
          generation_id?: string
          h1?: string | null
          headings?: Json
          id?: string
          internal_links?: Json
          meta_description?: string | null
          project_id?: string
          published_at?: string | null
          published_url?: string | null
          quality_checks?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["ai_content_status"]
          updated_at?: string
          version?: number
          word_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_generation_outputs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "ai_article_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_generation_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_article_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_generation_outputs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_generations: {
        Row: {
          banned_terms: string[]
          brand_profile_id: string | null
          completed_at: string | null
          created_at: string
          credits_charged: number
          error_message: string | null
          faq_count: number
          id: string
          idempotency_key: string | null
          include_faq: boolean
          input_params: Json
          keyword_id: string | null
          locale: string
          model_name: string | null
          model_provider: string | null
          outline_json: Json | null
          project_id: string
          prompt_version: string | null
          queued_at: string
          region: string | null
          requested_by: string | null
          secondary_keywords: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["ai_generation_status"]
          target_keyword: string
          tokens_input: number | null
          tokens_output: number | null
          tone: string | null
          updated_at: string
          word_count_target: number | null
          workspace_id: string | null
        }
        Insert: {
          banned_terms?: string[]
          brand_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          error_message?: string | null
          faq_count?: number
          id?: string
          idempotency_key?: string | null
          include_faq?: boolean
          input_params?: Json
          keyword_id?: string | null
          locale?: string
          model_name?: string | null
          model_provider?: string | null
          outline_json?: Json | null
          project_id: string
          prompt_version?: string | null
          queued_at?: string
          region?: string | null
          requested_by?: string | null
          secondary_keywords?: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_generation_status"]
          target_keyword: string
          tokens_input?: number | null
          tokens_output?: number | null
          tone?: string | null
          updated_at?: string
          word_count_target?: number | null
          workspace_id?: string | null
        }
        Update: {
          banned_terms?: string[]
          brand_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          error_message?: string | null
          faq_count?: number
          id?: string
          idempotency_key?: string | null
          include_faq?: boolean
          input_params?: Json
          keyword_id?: string | null
          locale?: string
          model_name?: string | null
          model_provider?: string | null
          outline_json?: Json | null
          project_id?: string
          prompt_version?: string | null
          queued_at?: string
          region?: string | null
          requested_by?: string | null
          secondary_keywords?: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_generation_status"]
          target_keyword?: string
          tokens_input?: number | null
          tokens_output?: number | null
          tone?: string | null
          updated_at?: string
          word_count_target?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_generations_brand_profile_id_fkey"
            columns: ["brand_profile_id"]
            isOneToOne: false
            referencedRelation: "ai_article_brand_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_generations_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "ai_article_keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_article_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_keywords: {
        Row: {
          cluster: string | null
          created_at: string
          created_by: string | null
          id: string
          keyword: string
          keyword_difficulty: number | null
          locale: string
          notes: string | null
          priority: number
          project_id: string
          region: string | null
          search_intent: string | null
          search_volume: number | null
          secondary_keywords: string[]
          status: string
          target_url: string | null
          updated_at: string
        }
        Insert: {
          cluster?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
          keyword_difficulty?: number | null
          locale?: string
          notes?: string | null
          priority?: number
          project_id: string
          region?: string | null
          search_intent?: string | null
          search_volume?: number | null
          secondary_keywords?: string[]
          status?: string
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          cluster?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
          keyword_difficulty?: number | null
          locale?: string
          notes?: string | null
          priority?: number
          project_id?: string
          region?: string | null
          search_intent?: string | null
          search_volume?: number | null
          secondary_keywords?: string[]
          status?: string
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_keywords_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_article_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_projects: {
        Row: {
          access_scope: string
          banned_terms: string[]
          brand_profile_id: string | null
          created_at: string
          created_by: string | null
          default_locale: string
          default_region: string | null
          default_tone: string | null
          description: string | null
          external_connection_id: string | null
          id: string
          name: string
          site_project_id: string | null
          status: string
          target_word_count: number
          updated_at: string
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          access_scope?: string
          banned_terms?: string[]
          brand_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          default_region?: string | null
          default_tone?: string | null
          description?: string | null
          external_connection_id?: string | null
          id?: string
          name: string
          site_project_id?: string | null
          status?: string
          target_word_count?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          access_scope?: string
          banned_terms?: string[]
          brand_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          default_region?: string | null
          default_tone?: string | null
          description?: string | null
          external_connection_id?: string | null
          id?: string
          name?: string
          site_project_id?: string | null
          status?: string
          target_word_count?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_projects_brand_profile_id_fkey"
            columns: ["brand_profile_id"]
            isOneToOne: false
            referencedRelation: "ai_article_brand_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_projects_external_connection_id_fkey"
            columns: ["external_connection_id"]
            isOneToOne: false
            referencedRelation: "external_project_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_projects_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_review_logs: {
        Row: {
          action: string
          checklist: Json
          comment: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["ai_content_status"] | null
          generation_id: string | null
          id: string
          output_id: string
          reviewer_id: string | null
          to_status: Database["public"]["Enums"]["ai_content_status"] | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          checklist?: Json
          comment?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ai_content_status"] | null
          generation_id?: string | null
          id?: string
          output_id: string
          reviewer_id?: string | null
          to_status?: Database["public"]["Enums"]["ai_content_status"] | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          checklist?: Json
          comment?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ai_content_status"] | null
          generation_id?: string | null
          id?: string
          output_id?: string
          reviewer_id?: string | null
          to_status?: Database["public"]["Enums"]["ai_content_status"] | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_review_logs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "ai_article_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_review_logs_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "ai_article_generation_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_review_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_usage_credits: {
        Row: {
          created_at: string
          credits_total: number
          credits_used: number
          entitlement_usage_quota_id: string | null
          granted_by: string | null
          id: string
          note: string | null
          period_end: string | null
          period_start: string
          source_type: string
          status: string
          updated_at: string
          user_entitlement_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          credits_total: number
          credits_used?: number
          entitlement_usage_quota_id?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string
          source_type: string
          status?: string
          updated_at?: string
          user_entitlement_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          entitlement_usage_quota_id?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string
          source_type?: string
          status?: string
          updated_at?: string
          user_entitlement_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_usage_credits_entitlement_usage_quota_id_fkey"
            columns: ["entitlement_usage_quota_id"]
            isOneToOne: false
            referencedRelation: "entitlement_usage_quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_usage_credits_user_entitlement_id_fkey"
            columns: ["user_entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_usage_credits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_usage_events: {
        Row: {
          actor_user_id: string | null
          balance_after: number | null
          created_at: string
          credit_id: string | null
          credits: number
          entitlement_usage_event_id: string | null
          event_type: string
          generation_id: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          workspace_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          balance_after?: number | null
          created_at?: string
          credit_id?: string | null
          credits: number
          entitlement_usage_event_id?: string | null
          event_type: string
          generation_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          workspace_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          balance_after?: number | null
          created_at?: string
          credit_id?: string | null
          credits?: number
          entitlement_usage_event_id?: string | null
          event_type?: string
          generation_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_usage_events_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "ai_article_usage_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_usage_events_entitlement_usage_event_id_fkey"
            columns: ["entitlement_usage_event_id"]
            isOneToOne: false
            referencedRelation: "entitlement_usage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_usage_events_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "ai_article_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_hash: string | null
          metadata: Json
          request_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          request_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          request_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_tags: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          cover_asset_id: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          reading_minutes: number | null
          scheduled_at: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_publish_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          cover_asset_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          scheduled_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["cms_publish_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          cover_asset_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          scheduled_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_publish_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_assets: {
        Row: {
          asset_id: string
          asset_role: string
          case_id: string
          created_at: string
          sort_order: number
        }
        Insert: {
          asset_id: string
          asset_role?: string
          case_id: string
          created_at?: string
          sort_order?: number
        }
        Update: {
          asset_id?: string
          asset_role?: string
          case_id?: string
          created_at?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_assets_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      case_metrics: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_metrics_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      case_products: {
        Row: {
          case_id: string
          created_at: string
          product_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          product_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_products_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      case_services: {
        Row: {
          case_id: string
          created_at: string
          service_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          service_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_services_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      case_studies: {
        Row: {
          challenge: string | null
          client_name: string | null
          cover_asset_id: string | null
          created_at: string
          id: string
          is_featured: boolean
          project_url: string | null
          published_at: string | null
          result: string | null
          slug: string
          solution: string | null
          sort_order: number
          status: Database["public"]["Enums"]["cms_publish_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          challenge?: string | null
          client_name?: string | null
          cover_asset_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          project_url?: string | null
          published_at?: string | null
          result?: string | null
          slug: string
          solution?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          challenge?: string | null
          client_name?: string | null
          cover_asset_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          project_url?: string | null
          published_at?: string | null
          result?: string | null
          slug?: string
          solution?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_studies_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          caption: string | null
          created_at: string
          filename: string
          height: number | null
          id: string
          mime_type: string
          public_url: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          mime_type: string
          public_url?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string
          public_url?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      cms_navigation_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          menu_id: string
          parent_id: string | null
          sort_order: number
          target: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          menu_id: string
          parent_id?: string | null
          sort_order?: number
          target?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          menu_id?: string
          parent_id?: string | null
          sort_order?: number
          target?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_navigation_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "cms_navigation_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_navigation_menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          menu_key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_page_sections: {
        Row: {
          asset_id: string | null
          content: Json
          created_at: string
          cta_primary: Json | null
          cta_secondary: Json | null
          id: string
          is_enabled: boolean
          page_id: string
          section_key: string
          section_type: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["cms_visibility"]
        }
        Insert: {
          asset_id?: string | null
          content?: Json
          created_at?: string
          cta_primary?: Json | null
          cta_secondary?: Json | null
          id?: string
          is_enabled?: boolean
          page_id: string
          section_key: string
          section_type: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["cms_visibility"]
        }
        Update: {
          asset_id?: string | null
          content?: Json
          created_at?: string
          cta_primary?: Json | null
          cta_secondary?: Json | null
          id?: string
          is_enabled?: boolean
          page_id?: string
          section_key?: string
          section_type?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["cms_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_sections_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          page_type: string
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_publish_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          page_type?: string
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["cms_publish_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          page_type?: string
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_publish_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cms_site_settings: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      commerce_bank_transfer_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          branch_code: string | null
          branch_name: string | null
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          is_enabled: boolean
          payment_method_id: string | null
          sort_order: number
          transfer_deadline_hours: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          branch_code?: string | null
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          payment_method_id?: string | null
          sort_order?: number
          transfer_deadline_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          branch_code?: string | null
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          payment_method_id?: string | null
          sort_order?: number
          transfer_deadline_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_bank_transfer_accounts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_checkout_sessions: {
        Row: {
          cancel_path: string | null
          company_name: string | null
          completed_at: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_user_id: string | null
          discount_cents: number
          expires_at: string
          id: string
          ip_hash: string | null
          line_items: Json
          metadata: Json
          order_id: string | null
          public_token_hash: string
          selected_payment_method_id: string | null
          source_path: string | null
          status: Database["public"]["Enums"]["checkout_session_status"]
          subtotal_cents: number
          success_path: string | null
          tax_id: string | null
          total_cents: number
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          workspace_id: string | null
        }
        Insert: {
          cancel_path?: string | null
          company_name?: string | null
          completed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          discount_cents?: number
          expires_at?: string
          id?: string
          ip_hash?: string | null
          line_items?: Json
          metadata?: Json
          order_id?: string | null
          public_token_hash: string
          selected_payment_method_id?: string | null
          source_path?: string | null
          status?: Database["public"]["Enums"]["checkout_session_status"]
          subtotal_cents?: number
          success_path?: string | null
          tax_id?: string | null
          total_cents?: number
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string | null
        }
        Update: {
          cancel_path?: string | null
          company_name?: string | null
          completed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          discount_cents?: number
          expires_at?: string
          id?: string
          ip_hash?: string | null
          line_items?: Json
          metadata?: Json
          order_id?: string | null
          public_token_hash?: string
          selected_payment_method_id?: string | null
          source_path?: string | null
          status?: Database["public"]["Enums"]["checkout_session_status"]
          subtotal_cents?: number
          success_path?: string | null
          tax_id?: string | null
          total_cents?: number
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_checkout_sessions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "commerce_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_checkout_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_checkout_sessions_selected_payment_method_id_fkey"
            columns: ["selected_payment_method_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_checkout_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_cents: number
          id: string
          order_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_cents: number
          id?: string
          order_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_cents?: number
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "commerce_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_coupons: {
        Row: {
          amount_off_cents: number | null
          applicable_intervals:
            | Database["public"]["Enums"]["billing_interval"][]
            | null
          applicable_product_codes:
            | Database["public"]["Enums"]["commerce_product_code"][]
            | null
          applicable_product_ids: string[] | null
          code: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          discount_type: string
          duration_in_periods: number | null
          expires_at: string | null
          first_order_only: boolean
          id: string
          is_active: boolean
          max_redemptions: number | null
          max_redemptions_per_user: number | null
          min_order_amount_cents: number
          name: string
          percent_off: number | null
          redeemed_count: number
          starts_at: string | null
          subscription_duration: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_off_cents?: number | null
          applicable_intervals?:
            | Database["public"]["Enums"]["billing_interval"][]
            | null
          applicable_product_codes?:
            | Database["public"]["Enums"]["commerce_product_code"][]
            | null
          applicable_product_ids?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          discount_type: string
          duration_in_periods?: number | null
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          max_redemptions_per_user?: number | null
          min_order_amount_cents?: number
          name: string
          percent_off?: number | null
          redeemed_count?: number
          starts_at?: string | null
          subscription_duration?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_off_cents?: number | null
          applicable_intervals?:
            | Database["public"]["Enums"]["billing_interval"][]
            | null
          applicable_product_codes?:
            | Database["public"]["Enums"]["commerce_product_code"][]
            | null
          applicable_product_ids?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          discount_type?: string
          duration_in_periods?: number | null
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          max_redemptions_per_user?: number | null
          min_order_amount_cents?: number
          name?: string
          percent_off?: number | null
          redeemed_count?: number
          starts_at?: string | null
          subscription_duration?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      commerce_order_items: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at: string
          discount_cents: number
          entitlement_product_id: string | null
          id: string
          interval_count: number
          metadata: Json
          order_id: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          product_id: string
          product_name: string
          product_price_id: string | null
          quantity: number
          sku: string
          subscription_plan_price_id: string | null
          template_id: string | null
          total_cents: number
          unit_amount_cents: number
          updated_at: string
        }
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          discount_cents?: number
          entitlement_product_id?: string | null
          id?: string
          interval_count?: number
          metadata?: Json
          order_id: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          product_id: string
          product_name: string
          product_price_id?: string | null
          quantity?: number
          sku: string
          subscription_plan_price_id?: string | null
          template_id?: string | null
          total_cents: number
          unit_amount_cents: number
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          discount_cents?: number
          entitlement_product_id?: string | null
          id?: string
          interval_count?: number
          metadata?: Json
          order_id?: string
          product_code?: Database["public"]["Enums"]["commerce_product_code"]
          product_id?: string
          product_name?: string
          product_price_id?: string | null
          quantity?: number
          sku?: string
          subscription_plan_price_id?: string | null
          template_id?: string | null
          total_cents?: number
          unit_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_order_items_entitlement_product_id_fkey"
            columns: ["entitlement_product_id"]
            isOneToOne: false
            referencedRelation: "entitlement_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_product_price_id_fkey"
            columns: ["product_price_id"]
            isOneToOne: false
            referencedRelation: "commerce_product_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_subscription_plan_price_id_fkey"
            columns: ["subscription_plan_price_id"]
            isOneToOne: false
            referencedRelation: "subscription_plan_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_orders: {
        Row: {
          admin_note: string | null
          buyer_company: string | null
          buyer_email: string
          buyer_name: string | null
          buyer_phone: string | null
          buyer_tax_id: string | null
          cancelled_at: string | null
          checkout_session_id: string | null
          coupon_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_user_id: string | null
          discount_cents: number
          entitlements_issued_at: string | null
          expires_at: string | null
          fulfilled_at: string | null
          id: string
          invoice_carrier_number: string | null
          invoice_love_code: string | null
          invoice_type: string | null
          metadata: Json
          order_number: string
          paid_at: string | null
          payment_method_id: string | null
          source: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          admin_note?: string | null
          buyer_company?: string | null
          buyer_email: string
          buyer_name?: string | null
          buyer_phone?: string | null
          buyer_tax_id?: string | null
          cancelled_at?: string | null
          checkout_session_id?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_user_id?: string | null
          discount_cents?: number
          entitlements_issued_at?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          invoice_carrier_number?: string | null
          invoice_love_code?: string | null
          invoice_type?: string | null
          metadata?: Json
          order_number?: string
          paid_at?: string | null
          payment_method_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          admin_note?: string | null
          buyer_company?: string | null
          buyer_email?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          buyer_tax_id?: string | null
          cancelled_at?: string | null
          checkout_session_id?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_user_id?: string | null
          discount_cents?: number
          entitlements_issued_at?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          invoice_carrier_number?: string | null
          invoice_love_code?: string | null
          invoice_type?: string | null
          metadata?: Json
          order_number?: string
          paid_at?: string | null
          payment_method_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_orders_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "commerce_checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "commerce_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payment_methods: {
        Row: {
          config_schema: Json
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          fee_fixed_cents: number
          fee_percent: number
          id: string
          is_enabled: boolean
          max_amount_cents: number | null
          method_key: string
          method_type: Database["public"]["Enums"]["payment_method_type"]
          min_amount_cents: number | null
          payment_deadline_minutes: number | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_config_id: string | null
          provider_method_code: string | null
          public_settings: Json
          sort_order: number
          supported_intervals: Database["public"]["Enums"]["billing_interval"][]
          supports_one_time: boolean
          supports_recurring: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_schema?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          fee_fixed_cents?: number
          fee_percent?: number
          id?: string
          is_enabled?: boolean
          max_amount_cents?: number | null
          method_key: string
          method_type: Database["public"]["Enums"]["payment_method_type"]
          min_amount_cents?: number | null
          payment_deadline_minutes?: number | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_config_id?: string | null
          provider_method_code?: string | null
          public_settings?: Json
          sort_order?: number
          supported_intervals?: Database["public"]["Enums"]["billing_interval"][]
          supports_one_time?: boolean
          supports_recurring?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_schema?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          fee_fixed_cents?: number
          fee_percent?: number
          id?: string
          is_enabled?: boolean
          max_amount_cents?: number | null
          method_key?: string
          method_type?: Database["public"]["Enums"]["payment_method_type"]
          min_amount_cents?: number | null
          payment_deadline_minutes?: number | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_config_id?: string | null
          provider_method_code?: string | null
          public_settings?: Json
          sort_order?: number
          supported_intervals?: Database["public"]["Enums"]["billing_interval"][]
          supports_one_time?: boolean
          supports_recurring?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payment_methods_provider_config_id_fkey"
            columns: ["provider_config_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payment_provider_configs: {
        Row: {
          api_base_url: string | null
          config_schema: Json
          created_at: string
          created_by: string | null
          display_name: string
          environment: Database["public"]["Enums"]["provider_environment"]
          id: string
          is_enabled: boolean
          last_verified_at: string | null
          merchant_id: string | null
          notes: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          public_config: Json
          secret_refs: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_base_url?: string | null
          config_schema?: Json
          created_at?: string
          created_by?: string | null
          display_name: string
          environment?: Database["public"]["Enums"]["provider_environment"]
          id?: string
          is_enabled?: boolean
          last_verified_at?: string | null
          merchant_id?: string | null
          notes?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          public_config?: Json
          secret_refs?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_base_url?: string | null
          config_schema?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string
          environment?: Database["public"]["Enums"]["provider_environment"]
          id?: string
          is_enabled?: boolean
          last_verified_at?: string | null
          merchant_id?: string | null
          notes?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          public_config?: Json
          secret_refs?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      commerce_payment_transactions: {
        Row: {
          actor_id: string | null
          amount_cents: number
          created_at: string
          id: string
          occurred_at: string
          payment_id: string
          provider_rtn_code: string | null
          provider_rtn_msg: string | null
          provider_transaction_id: string | null
          request_payload: Json
          response_payload: Json
          status: string
          transaction_type: string
          webhook_event_id: string | null
        }
        Insert: {
          actor_id?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          occurred_at?: string
          payment_id: string
          provider_rtn_code?: string | null
          provider_rtn_msg?: string | null
          provider_transaction_id?: string | null
          request_payload?: Json
          response_payload?: Json
          status: string
          transaction_type: string
          webhook_event_id?: string | null
        }
        Update: {
          actor_id?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          occurred_at?: string
          payment_id?: string
          provider_rtn_code?: string | null
          provider_rtn_msg?: string | null
          provider_transaction_id?: string | null
          request_payload?: Json
          response_payload?: Json
          status?: string
          transaction_type?: string
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payment_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_transactions_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "commerce_webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payments: {
        Row: {
          amount_cents: number
          atm_bank_code: string | null
          atm_virtual_account: string | null
          auth_code: string | null
          bank_transfer_account_id: string | null
          card_last4: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_subscription_id: string | null
          environment: Database["public"]["Enums"]["provider_environment"]
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string | null
          is_manual_mark: boolean
          is_recurring: boolean
          merchant_trade_no: string | null
          method_type: Database["public"]["Enums"]["payment_method_type"]
          order_id: string
          paid_at: string | null
          payment_deadline_at: string | null
          payment_method_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_type: string | null
          provider_trade_no: string | null
          recurring_exec_times: number | null
          recurring_frequency: number | null
          recurring_period_type: string | null
          request_payload_sanitized: Json
          response_summary: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transfer_account_last5: string | null
          transfer_reported_at: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          atm_bank_code?: string | null
          atm_virtual_account?: string | null
          auth_code?: string | null
          bank_transfer_account_id?: string | null
          card_last4?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_subscription_id?: string | null
          environment?: Database["public"]["Enums"]["provider_environment"]
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string | null
          is_manual_mark?: boolean
          is_recurring?: boolean
          merchant_trade_no?: string | null
          method_type: Database["public"]["Enums"]["payment_method_type"]
          order_id: string
          paid_at?: string | null
          payment_deadline_at?: string | null
          payment_method_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_type?: string | null
          provider_trade_no?: string | null
          recurring_exec_times?: number | null
          recurring_frequency?: number | null
          recurring_period_type?: string | null
          request_payload_sanitized?: Json
          response_summary?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transfer_account_last5?: string | null
          transfer_reported_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          atm_bank_code?: string | null
          atm_virtual_account?: string | null
          auth_code?: string | null
          bank_transfer_account_id?: string | null
          card_last4?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_subscription_id?: string | null
          environment?: Database["public"]["Enums"]["provider_environment"]
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string | null
          is_manual_mark?: boolean
          is_recurring?: boolean
          merchant_trade_no?: string | null
          method_type?: Database["public"]["Enums"]["payment_method_type"]
          order_id?: string
          paid_at?: string | null
          payment_deadline_at?: string | null
          payment_method_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_type?: string | null
          provider_trade_no?: string | null
          recurring_exec_times?: number | null
          recurring_frequency?: number | null
          recurring_period_type?: string | null
          request_payload_sanitized?: Json
          response_summary?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transfer_account_last5?: string | null
          transfer_reported_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payments_bank_transfer_account_id_fkey"
            columns: ["bank_transfer_account_id"]
            isOneToOne: false
            referencedRelation: "commerce_bank_transfer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payments_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "commerce_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_product_prices: {
        Row: {
          amount_cents: number
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          compare_at_amount_cents: number | null
          created_at: string
          currency: string
          ends_at: string | null
          id: string
          interval_count: number
          is_active: boolean
          is_default: boolean
          metadata: Json
          name: string | null
          price_key: string
          product_id: string
          starts_at: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          amount_cents: number
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          compare_at_amount_cents?: number | null
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          interval_count?: number
          is_active?: boolean
          is_default?: boolean
          metadata?: Json
          name?: string | null
          price_key: string
          product_id: string
          starts_at?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          compare_at_amount_cents?: number | null
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          interval_count?: number
          is_active?: boolean
          is_default?: boolean
          metadata?: Json
          name?: string | null
          price_key?: string
          product_id?: string
          starts_at?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_products: {
        Row: {
          cover_asset_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entitlement_product_id: string | null
          id: string
          is_self_serve: boolean
          is_visible: boolean
          metadata: Json
          name: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          product_kind: string
          published_at: string | null
          requires_quote: boolean
          short_description: string | null
          site_type: Database["public"]["Enums"]["site_type"] | null
          sku: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["cms_publish_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entitlement_product_id?: string | null
          id?: string
          is_self_serve?: boolean
          is_visible?: boolean
          metadata?: Json
          name: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          product_kind?: string
          published_at?: string | null
          requires_quote?: boolean
          short_description?: string | null
          site_type?: Database["public"]["Enums"]["site_type"] | null
          sku: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entitlement_product_id?: string | null
          id?: string
          is_self_serve?: boolean
          is_visible?: boolean
          metadata?: Json
          name?: string
          product_code?: Database["public"]["Enums"]["commerce_product_code"]
          product_kind?: string
          published_at?: string | null
          requires_quote?: boolean
          short_description?: string | null
          site_type?: Database["public"]["Enums"]["site_type"] | null
          sku?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_products_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_products_entitlement_product_id_fkey"
            columns: ["entitlement_product_id"]
            isOneToOne: false
            referencedRelation: "entitlement_products"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_refunds: {
        Row: {
          amount_cents: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string
          failure_message: string | null
          id: string
          metadata: Json
          order_id: string
          payment_id: string | null
          processed_at: string | null
          provider_refund_ref: string | null
          reason_code: string | null
          reason_text: string | null
          refund_number: string
          requested_by: string | null
          revoke_entitlements: boolean
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          metadata?: Json
          order_id: string
          payment_id?: string | null
          processed_at?: string | null
          provider_refund_ref?: string | null
          reason_code?: string | null
          reason_text?: string | null
          refund_number?: string
          requested_by?: string | null
          revoke_entitlements?: boolean
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          payment_id?: string | null
          processed_at?: string | null
          provider_refund_ref?: string | null
          reason_code?: string | null
          reason_text?: string | null
          refund_number?: string
          requested_by?: string | null
          revoke_entitlements?: boolean
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_webhook_events: {
        Row: {
          created_at: string
          environment: Database["public"]["Enums"]["provider_environment"]
          error_message: string | null
          event_type: string
          headers_sanitized: Json
          http_method: string
          id: string
          idempotency_key: string
          payload_purged_at: string | null
          payload_sha256: string | null
          processed_at: string | null
          processing_attempts: number
          processing_status: Database["public"]["Enums"]["webhook_processing_status"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string | null
          raw_body: string | null
          raw_payload: Json | null
          received_at: string
          related_order_id: string | null
          related_payment_id: string | null
          request_path: string | null
          signature_checked_at: string | null
          signature_valid: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          environment?: Database["public"]["Enums"]["provider_environment"]
          error_message?: string | null
          event_type: string
          headers_sanitized?: Json
          http_method?: string
          id?: string
          idempotency_key: string
          payload_purged_at?: string | null
          payload_sha256?: string | null
          processed_at?: string | null
          processing_attempts?: number
          processing_status?: Database["public"]["Enums"]["webhook_processing_status"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id?: string | null
          raw_body?: string | null
          raw_payload?: Json | null
          received_at?: string
          related_order_id?: string | null
          related_payment_id?: string | null
          request_path?: string | null
          signature_checked_at?: string | null
          signature_valid?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          environment?: Database["public"]["Enums"]["provider_environment"]
          error_message?: string | null
          event_type?: string
          headers_sanitized?: Json
          http_method?: string
          id?: string
          idempotency_key?: string
          payload_purged_at?: string | null
          payload_sha256?: string | null
          processed_at?: string | null
          processing_attempts?: number
          processing_status?: Database["public"]["Enums"]["webhook_processing_status"]
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_event_id?: string | null
          raw_body?: string | null
          raw_payload?: Json | null
          received_at?: string
          related_order_id?: string | null
          related_payment_id?: string | null
          request_path?: string | null
          signature_checked_at?: string | null
          signature_valid?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_webhook_events_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_webhook_events_related_payment_id_fkey"
            columns: ["related_payment_id"]
            isOneToOne: false
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          company: string | null
          consent_at: string
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          ip_hash: string | null
          message: string
          name: string
          phone: string | null
          service_interest: string | null
          source_path: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          company?: string | null
          consent_at: string
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          message: string
          name: string
          phone?: string | null
          service_interest?: string | null
          source_path?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          company?: string | null
          consent_at?: string
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          message?: string
          name?: string
          phone?: string | null
          service_interest?: string | null
          source_path?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          anonymous_id: string | null
          created_at: string
          event_name: string
          id: number
          properties: Json
          session_id: string | null
          source_path: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          event_name: string
          id?: never
          properties?: Json
          session_id?: string | null
          source_path?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          event_name?: string
          id?: never
          properties?: Json
          session_id?: string | null
          source_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cta_blocks: {
        Row: {
          asset_id: string | null
          created_at: string
          cta_key: string
          description: string | null
          id: string
          is_active: boolean
          primary_label: string | null
          primary_url: string | null
          secondary_label: string | null
          secondary_url: string | null
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          cta_key: string
          description?: string | null
          id?: string
          is_active?: boolean
          primary_label?: string | null
          primary_url?: string | null
          secondary_label?: string | null
          secondary_url?: string | null
          theme?: string
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          cta_key?: string
          description?: string | null
          id?: string
          is_active?: boolean
          primary_label?: string | null
          primary_url?: string | null
          secondary_label?: string | null
          secondary_url?: string | null
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cta_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          company_name: string | null
          created_at: string
          default_locale: string
          display_name: string | null
          marketing_consent_at: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          default_locale?: string
          display_name?: string | null
          marketing_consent_at?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          default_locale?: string
          display_name?: string | null
          marketing_consent_at?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_site_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          caption: string | null
          created_at: string
          filename: string
          height: number | null
          id: string
          mime_type: string
          public_url: string | null
          site_project_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
          workspace_id: string
        }
        Insert: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          mime_type: string
          public_url?: string | null
          site_project_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
          workspace_id: string
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string
          public_url?: string | null
          site_project_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_assets_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_content_values: {
        Row: {
          asset_id: string | null
          content_state: Database["public"]["Enums"]["site_content_state"]
          created_at: string
          field_id: string
          field_key: string
          id: string
          locale: string
          published_at: string | null
          section_id: string
          site_project_id: string
          updated_at: string
          updated_by: string | null
          value: Json | null
          version: number
        }
        Insert: {
          asset_id?: string | null
          content_state?: Database["public"]["Enums"]["site_content_state"]
          created_at?: string
          field_id: string
          field_key: string
          id?: string
          locale?: string
          published_at?: string | null
          section_id: string
          site_project_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
          version?: number
        }
        Update: {
          asset_id?: string | null
          content_state?: Database["public"]["Enums"]["site_content_state"]
          created_at?: string
          field_id?: string
          field_key?: string
          id?: string
          locale?: string
          published_at?: string | null
          section_id?: string
          site_project_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_content_values_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "customer_site_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_content_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "customer_site_section_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_content_values_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "customer_site_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_content_values_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_deployments: {
        Row: {
          content_snapshot: Json
          created_at: string
          id: string
          notes: string | null
          pages_count: number
          published_at: string
          published_by: string | null
          site_project_id: string
          status: string
          template_version_id: string | null
          updated_at: string
          version_number: number
        }
        Insert: {
          content_snapshot?: Json
          created_at?: string
          id?: string
          notes?: string | null
          pages_count?: number
          published_at?: string
          published_by?: string | null
          site_project_id: string
          status?: string
          template_version_id?: string | null
          updated_at?: string
          version_number: number
        }
        Update: {
          content_snapshot?: Json
          created_at?: string
          id?: string
          notes?: string | null
          pages_count?: number
          published_at?: string
          published_by?: string | null
          site_project_id?: string
          status?: string
          template_version_id?: string | null
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_deployments_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_deployments_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_footer_settings: {
        Row: {
          columns: Json
          copyright_text: string | null
          created_at: string
          description: string | null
          id: string
          legal_links: Json
          show_contact_info: boolean
          show_social_links: boolean
          site_project_id: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          copyright_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legal_links?: Json
          show_contact_info?: boolean
          show_social_links?: boolean
          site_project_id: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          copyright_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legal_links?: Json
          show_contact_info?: boolean
          show_social_links?: boolean
          site_project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_footer_settings_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: true
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_form_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          label: string
          max_length: number
          options: Json
          placeholder: string | null
          site_project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          max_length?: number
          options?: Json
          placeholder?: string | null
          site_project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          max_length?: number
          options?: Json
          placeholder?: string | null
          site_project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "customer_site_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_form_fields_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_form_submissions: {
        Row: {
          consent_at: string | null
          created_at: string
          form_id: string
          handled_at: string | null
          handled_by: string | null
          id: string
          ip_hash: string | null
          payload: Json
          site_project_id: string
          source_path: string | null
          spam_score: number | null
          status: string
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          workspace_id: string
        }
        Insert: {
          consent_at?: string | null
          created_at?: string
          form_id: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_hash?: string | null
          payload: Json
          site_project_id: string
          source_path?: string | null
          spam_score?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id: string
        }
        Update: {
          consent_at?: string | null
          created_at?: string
          form_id?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_hash?: string | null
          payload?: Json
          site_project_id?: string
          source_path?: string | null
          spam_score?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "customer_site_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_form_submissions_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_form_submissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_forms: {
        Row: {
          created_at: string
          enable_honeypot: boolean
          enable_turnstile: boolean
          form_key: string
          id: string
          is_active: boolean
          name: string
          notification_emails: string[]
          page_id: string | null
          redirect_path: string | null
          site_project_id: string
          submission_retention_days: number
          success_message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_honeypot?: boolean
          enable_turnstile?: boolean
          form_key: string
          id?: string
          is_active?: boolean
          name: string
          notification_emails?: string[]
          page_id?: string | null
          redirect_path?: string | null
          site_project_id: string
          submission_retention_days?: number
          success_message?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_honeypot?: boolean
          enable_turnstile?: boolean
          form_key?: string
          id?: string
          is_active?: boolean
          name?: string
          notification_emails?: string[]
          page_id?: string | null
          redirect_path?: string | null
          site_project_id?: string
          submission_retention_days?: number
          success_message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_forms_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "customer_site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_forms_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_navigation_items: {
        Row: {
          anchor: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          link_type: string
          menu_id: string
          page_id: string | null
          parent_id: string | null
          site_project_id: string
          sort_order: number
          target: string
          updated_at: string
          url: string | null
        }
        Insert: {
          anchor?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          link_type?: string
          menu_id: string
          page_id?: string | null
          parent_id?: string | null
          site_project_id: string
          sort_order?: number
          target?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          anchor?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          link_type?: string
          menu_id?: string
          page_id?: string | null
          parent_id?: string | null
          site_project_id?: string
          sort_order?: number
          target?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_navigation_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "customer_site_navigation_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_navigation_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "customer_site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "customer_site_navigation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_navigation_items_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_navigation_menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          menu_key: string
          name: string
          site_project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_key: string
          name: string
          site_project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_key?: string
          name?: string
          site_project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_navigation_menus_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_pages: {
        Row: {
          canonical_url: string | null
          created_at: string
          created_by: string | null
          h1: string | null
          id: string
          is_indexable: boolean
          meta_description: string | null
          og_description: string | null
          og_image_asset_id: string | null
          og_title: string | null
          page_key: string
          page_type: string
          path: string
          published_at: string | null
          published_snapshot: Json | null
          robots: string
          scheduled_at: string | null
          schema_json: Json
          seo_title: string | null
          show_in_navigation: boolean
          site_project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["cms_publish_status"]
          template_page_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          h1?: string | null
          id?: string
          is_indexable?: boolean
          meta_description?: string | null
          og_description?: string | null
          og_image_asset_id?: string | null
          og_title?: string | null
          page_key: string
          page_type?: string
          path: string
          published_at?: string | null
          published_snapshot?: Json | null
          robots?: string
          scheduled_at?: string | null
          schema_json?: Json
          seo_title?: string | null
          show_in_navigation?: boolean
          site_project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          template_page_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          h1?: string | null
          id?: string
          is_indexable?: boolean
          meta_description?: string | null
          og_description?: string | null
          og_image_asset_id?: string | null
          og_title?: string | null
          page_key?: string
          page_type?: string
          path?: string
          published_at?: string | null
          published_snapshot?: Json | null
          robots?: string
          scheduled_at?: string | null
          schema_json?: Json
          seo_title?: string | null
          show_in_navigation?: boolean
          site_project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          template_page_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_pages_og_image_asset_id_fkey"
            columns: ["og_image_asset_id"]
            isOneToOne: false
            referencedRelation: "customer_site_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_pages_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_pages_template_page_id_fkey"
            columns: ["template_page_id"]
            isOneToOne: false
            referencedRelation: "site_template_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_project_settings: {
        Row: {
          address: string | null
          business_hours: Json
          contact_email: string | null
          contact_line_id: string | null
          contact_phone: string | null
          created_at: string
          default_meta_description: string | null
          default_og_image_asset_id: string | null
          default_seo_title: string | null
          favicon_asset_id: string | null
          ga4_measurement_id: string | null
          google_site_verification: string | null
          gtm_container_id: string | null
          id: string
          logo_asset_id: string | null
          organization_schema_json: Json
          robots_default: string
          site_name: string | null
          site_project_id: string
          social_links: Json
          tagline: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_hours?: Json
          contact_email?: string | null
          contact_line_id?: string | null
          contact_phone?: string | null
          created_at?: string
          default_meta_description?: string | null
          default_og_image_asset_id?: string | null
          default_seo_title?: string | null
          favicon_asset_id?: string | null
          ga4_measurement_id?: string | null
          google_site_verification?: string | null
          gtm_container_id?: string | null
          id?: string
          logo_asset_id?: string | null
          organization_schema_json?: Json
          robots_default?: string
          site_name?: string | null
          site_project_id: string
          social_links?: Json
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_hours?: Json
          contact_email?: string | null
          contact_line_id?: string | null
          contact_phone?: string | null
          created_at?: string
          default_meta_description?: string | null
          default_og_image_asset_id?: string | null
          default_seo_title?: string | null
          favicon_asset_id?: string | null
          ga4_measurement_id?: string | null
          google_site_verification?: string | null
          gtm_container_id?: string | null
          id?: string
          logo_asset_id?: string | null
          organization_schema_json?: Json
          robots_default?: string
          site_name?: string | null
          site_project_id?: string
          social_links?: Json
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_project_settings_default_og_image_asset_id_fkey"
            columns: ["default_og_image_asset_id"]
            isOneToOne: false
            referencedRelation: "customer_site_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_project_settings_favicon_asset_id_fkey"
            columns: ["favicon_asset_id"]
            isOneToOne: false
            referencedRelation: "customer_site_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_project_settings_logo_asset_id_fkey"
            columns: ["logo_asset_id"]
            isOneToOne: false
            referencedRelation: "customer_site_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_project_settings_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: true
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_projects: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          default_locale: string
          entitlement_id: string | null
          id: string
          metadata: Json
          name: string
          published_at: string | null
          published_version: number
          site_type: Database["public"]["Enums"]["site_type"]
          slug: string
          status: Database["public"]["Enums"]["site_project_status"]
          suspended_at: string | null
          suspended_reason: string | null
          template_id: string | null
          template_version_id: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          entitlement_id?: string | null
          id?: string
          metadata?: Json
          name: string
          published_at?: string | null
          published_version?: number
          site_type: Database["public"]["Enums"]["site_type"]
          slug: string
          status?: Database["public"]["Enums"]["site_project_status"]
          suspended_at?: string | null
          suspended_reason?: string | null
          template_id?: string | null
          template_version_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          entitlement_id?: string | null
          id?: string
          metadata?: Json
          name?: string
          published_at?: string | null
          published_version?: number
          site_type?: Database["public"]["Enums"]["site_type"]
          slug?: string
          status?: Database["public"]["Enums"]["site_project_status"]
          suspended_at?: string | null
          suspended_reason?: string | null
          template_id?: string | null
          template_version_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_projects_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_projects_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_publish_settings: {
        Row: {
          auto_deploy_on_publish: boolean
          created_at: string
          id: string
          is_public: boolean
          last_published_at: string | null
          last_published_by: string | null
          preview_enabled: boolean
          preview_noindex: boolean
          preview_token_expires_at: string | null
          preview_token_sha256: string | null
          publish_mode: string
          site_project_id: string
          sitemap_enabled: boolean
          updated_at: string
        }
        Insert: {
          auto_deploy_on_publish?: boolean
          created_at?: string
          id?: string
          is_public?: boolean
          last_published_at?: string | null
          last_published_by?: string | null
          preview_enabled?: boolean
          preview_noindex?: boolean
          preview_token_expires_at?: string | null
          preview_token_sha256?: string | null
          publish_mode?: string
          site_project_id: string
          sitemap_enabled?: boolean
          updated_at?: string
        }
        Update: {
          auto_deploy_on_publish?: boolean
          created_at?: string
          id?: string
          is_public?: boolean
          last_published_at?: string | null
          last_published_by?: string | null
          preview_enabled?: boolean
          preview_noindex?: boolean
          preview_token_expires_at?: string | null
          preview_token_sha256?: string | null
          publish_mode?: string
          site_project_id?: string
          sitemap_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_publish_settings_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: true
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_section_fields: {
        Row: {
          created_at: string
          default_value: Json | null
          field_key: string
          field_type: Database["public"]["Enums"]["site_field_type"]
          group_label: string | null
          help_text: string | null
          id: string
          is_customer_editable: boolean
          is_required: boolean
          label: string
          options: Json
          section_id: string
          site_project_id: string
          sort_order: number
          template_field_id: string | null
          updated_at: string
          validation_schema: Json
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          field_key: string
          field_type: Database["public"]["Enums"]["site_field_type"]
          group_label?: string | null
          help_text?: string | null
          id?: string
          is_customer_editable?: boolean
          is_required?: boolean
          label: string
          options?: Json
          section_id: string
          site_project_id: string
          sort_order?: number
          template_field_id?: string | null
          updated_at?: string
          validation_schema?: Json
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          field_key?: string
          field_type?: Database["public"]["Enums"]["site_field_type"]
          group_label?: string | null
          help_text?: string | null
          id?: string
          is_customer_editable?: boolean
          is_required?: boolean
          label?: string
          options?: Json
          section_id?: string
          site_project_id?: string
          sort_order?: number
          template_field_id?: string | null
          updated_at?: string
          validation_schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_section_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "customer_site_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_section_fields_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_section_fields_template_field_id_fkey"
            columns: ["template_field_id"]
            isOneToOne: false
            referencedRelation: "site_template_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_sections: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          page_id: string
          section_key: string
          section_type: string
          settings: Json
          site_project_id: string
          sort_order: number
          template_section_id: string | null
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["cms_visibility"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          page_id: string
          section_key: string
          section_type: string
          settings?: Json
          site_project_id: string
          sort_order?: number
          template_section_id?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["cms_visibility"]
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          page_id?: string
          section_key?: string
          section_type?: string
          settings?: Json
          site_project_id?: string
          sort_order?: number
          template_section_id?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["cms_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "customer_site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_sections_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_site_sections_template_section_id_fkey"
            columns: ["template_section_id"]
            isOneToOne: false
            referencedRelation: "site_template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_site_theme_settings: {
        Row: {
          button_style: string
          color_tokens: Json
          created_at: string
          id: string
          radius: string
          site_project_id: string
          spacing_scale: string
          theme_variant: string
          typography: Json
          updated_at: string
        }
        Insert: {
          button_style?: string
          color_tokens?: Json
          created_at?: string
          id?: string
          radius?: string
          site_project_id: string
          spacing_scale?: string
          theme_variant?: string
          typography?: Json
          updated_at?: string
        }
        Update: {
          button_style?: string
          color_tokens?: Json
          created_at?: string
          id?: string
          radius?: string
          site_project_id?: string
          spacing_scale?: string
          theme_variant?: string
          typography?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_site_theme_settings_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: true
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          customer_user_id: string
          ended_at: string | null
          id: string
          initial_order_id: string | null
          interval_count: number
          metadata: Json
          next_billing_at: string | null
          plan_id: string
          plan_price_id: string
          provider: Database["public"]["Enums"]["payment_provider"] | null
          provider_subscription_ref: string | null
          renewal_status: string
          retry_count: number
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          auto_renew?: boolean
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_user_id: string
          ended_at?: string | null
          id?: string
          initial_order_id?: string | null
          interval_count?: number
          metadata?: Json
          next_billing_at?: string | null
          plan_id: string
          plan_price_id: string
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          provider_subscription_ref?: string | null
          renewal_status?: string
          retry_count?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          auto_renew?: boolean
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_user_id?: string
          ended_at?: string | null
          id?: string
          initial_order_id?: string | null
          interval_count?: number
          metadata?: Json
          next_billing_at?: string | null
          plan_id?: string
          plan_price_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          provider_subscription_ref?: string | null
          renewal_status?: string
          retry_count?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_initial_order_id_fkey"
            columns: ["initial_order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_plan_price_id_fkey"
            columns: ["plan_price_id"]
            isOneToOne: false
            referencedRelation: "subscription_plan_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_workspace_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["workspace_member_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token_sha256: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_sha256: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_sha256?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["workspace_member_role"]
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_workspace_settings: {
        Row: {
          billing_contact: Json
          brand_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          feature_flags: Json
          id: string
          notification_settings: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_contact?: Json
          brand_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          feature_flags?: Json
          id?: string
          notification_settings?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_contact?: Json
          brand_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          feature_flags?: Json
          id?: string
          notification_settings?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_workspaces: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          default_locale: string
          id: string
          metadata: Json
          name: string
          owner_user_id: string
          site_project_limit_override: number | null
          slug: string
          source_access_code_id: string | null
          source_entitlement_id: string | null
          status: string
          suspended_at: string | null
          suspended_reason: string | null
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          id?: string
          metadata?: Json
          name: string
          owner_user_id: string
          site_project_limit_override?: number | null
          slug: string
          source_access_code_id?: string | null
          source_entitlement_id?: string | null
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_locale?: string
          id?: string
          metadata?: Json
          name?: string
          owner_user_id?: string
          site_project_limit_override?: number | null
          slug?: string
          source_access_code_id?: string | null
          source_entitlement_id?: string | null
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_workspaces_source_access_code_id_fkey"
            columns: ["source_access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_workspaces_source_entitlement_id_fkey"
            columns: ["source_entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_feature_rules: {
        Row: {
          config: Json
          created_at: string
          entitlement_product_id: string
          feature_id: string
          id: string
          is_enabled: boolean
          limit_value: number | null
          quota_amount: number | null
          quota_period: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          entitlement_product_id: string
          feature_id: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          quota_amount?: number | null
          quota_period?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          entitlement_product_id?: string
          feature_id?: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          quota_amount?: number | null
          quota_period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_feature_rules_entitlement_product_id_fkey"
            columns: ["entitlement_product_id"]
            isOneToOne: false
            referencedRelation: "entitlement_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_feature_rules_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "entitlement_features"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_features: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          unit: string | null
          updated_at: string
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
          value_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
          value_type?: string
        }
        Relationships: []
      }
      entitlement_products: {
        Row: {
          code_valid_days: number | null
          created_at: string
          created_by: string | null
          default_duration_days: number | null
          description: string | null
          entitlement_key: string
          id: string
          is_active: boolean
          is_transferable_before_redeem: boolean
          max_workspace_members: number | null
          metadata: Json
          name: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code_valid_days?: number | null
          created_at?: string
          created_by?: string | null
          default_duration_days?: number | null
          description?: string | null
          entitlement_key: string
          id?: string
          is_active?: boolean
          is_transferable_before_redeem?: boolean
          max_workspace_members?: number | null
          metadata?: Json
          name: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code_valid_days?: number | null
          created_at?: string
          created_by?: string | null
          default_duration_days?: number | null
          description?: string | null
          entitlement_key?: string
          id?: string
          is_active?: boolean
          is_transferable_before_redeem?: boolean
          max_workspace_members?: number | null
          metadata?: Json
          name?: string
          product_code?: Database["public"]["Enums"]["commerce_product_code"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      entitlement_usage_events: {
        Row: {
          actor_user_id: string | null
          amount: number
          created_at: string
          id: string
          idempotency_key: string | null
          metadata: Json
          quota_id: string | null
          quota_used_after: number | null
          reference_id: string | null
          reference_type: string | null
          usage_key: string
          user_entitlement_id: string
          workspace_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          amount: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          quota_id?: string | null
          quota_used_after?: number | null
          reference_id?: string | null
          reference_type?: string | null
          usage_key: string
          user_entitlement_id: string
          workspace_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          quota_id?: string | null
          quota_used_after?: number | null
          reference_id?: string | null
          reference_type?: string | null
          usage_key?: string
          user_entitlement_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_usage_events_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "entitlement_usage_quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_usage_events_user_entitlement_id_fkey"
            columns: ["user_entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_usage_quotas: {
        Row: {
          created_at: string
          id: string
          period_end: string | null
          period_start: string
          quota_limit: number | null
          quota_used: number
          reset_period: string
          updated_at: string
          usage_key: string
          user_entitlement_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string
          quota_limit?: number | null
          quota_used?: number
          reset_period?: string
          updated_at?: string
          usage_key: string
          user_entitlement_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string
          quota_limit?: number | null
          quota_used?: number
          reset_period?: string
          updated_at?: string
          usage_key?: string
          user_entitlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_usage_quotas_user_entitlement_id_fkey"
            columns: ["user_entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      external_project_cms_mappings: {
        Row: {
          connection_id: string
          created_at: string
          field_mappings: Json
          id: string
          is_active: boolean
          last_sync_hash: string | null
          last_synced_at: string | null
          source_entity: string
          source_identifier: string
          sync_mode: string
          target_entity_id: string | null
          target_table: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          field_mappings?: Json
          id?: string
          is_active?: boolean
          last_sync_hash?: string | null
          last_synced_at?: string | null
          source_entity: string
          source_identifier: string
          sync_mode?: string
          target_entity_id?: string | null
          target_table: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          field_mappings?: Json
          id?: string
          is_active?: boolean
          last_sync_hash?: string | null
          last_synced_at?: string | null
          source_entity?: string
          source_identifier?: string
          sync_mode?: string
          target_entity_id?: string | null
          target_table?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_project_cms_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "external_project_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      external_project_connections: {
        Row: {
          audit_notes: string | null
          audit_status: string
          cms_integration_mode: string
          connection_key: string
          created_at: string
          created_by: string | null
          framework: string
          has_env: boolean | null
          has_git: boolean | null
          has_supabase: boolean | null
          id: string
          last_audited_at: string | null
          last_synced_at: string | null
          local_path_hint: string | null
          metadata: Json
          name: string
          production_url: string | null
          project_kind: string
          repository_url: string | null
          secret_refs: Json
          site_project_id: string | null
          status: Database["public"]["Enums"]["external_connection_status"]
          supabase_project_ref: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          audit_notes?: string | null
          audit_status?: string
          cms_integration_mode?: string
          connection_key: string
          created_at?: string
          created_by?: string | null
          framework?: string
          has_env?: boolean | null
          has_git?: boolean | null
          has_supabase?: boolean | null
          id?: string
          last_audited_at?: string | null
          last_synced_at?: string | null
          local_path_hint?: string | null
          metadata?: Json
          name: string
          production_url?: string | null
          project_kind: string
          repository_url?: string | null
          secret_refs?: Json
          site_project_id?: string | null
          status?: Database["public"]["Enums"]["external_connection_status"]
          supabase_project_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          audit_notes?: string | null
          audit_status?: string
          cms_integration_mode?: string
          connection_key?: string
          created_at?: string
          created_by?: string | null
          framework?: string
          has_env?: boolean | null
          has_git?: boolean | null
          has_supabase?: boolean | null
          id?: string
          last_audited_at?: string | null
          last_synced_at?: string | null
          local_path_hint?: string | null
          metadata?: Json
          name?: string
          production_url?: string | null
          project_kind?: string
          repository_url?: string | null
          secret_refs?: Json
          site_project_id?: string | null
          status?: Database["public"]["Enums"]["external_connection_status"]
          supabase_project_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_project_connections_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_project_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      external_project_sync_logs: {
        Row: {
          connection_id: string
          created_at: string
          entity_type: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          records_failed: number
          records_processed: number
          started_at: string
          status: string
          summary: Json
          sync_direction: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          entity_type?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          records_failed?: number
          records_processed?: number
          started_at?: string
          status?: string
          summary?: Json
          sync_direction: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          entity_type?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          records_failed?: number
          records_processed?: number
          started_at?: string
          status?: string
          summary?: Json
          sync_direction?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_project_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "external_project_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_features: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          product_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          product_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          product_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          app_store_url: string | null
          cover_asset_id: string | null
          created_at: string
          description: string | null
          external_url: string | null
          icon_asset_id: string | null
          id: string
          is_featured: boolean
          name: string
          play_store_url: string | null
          product_type: string
          published_at: string | null
          short_description: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["cms_publish_status"]
          updated_at: string
        }
        Insert: {
          app_store_url?: string | null
          cover_asset_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          icon_asset_id?: string | null
          id?: string
          is_featured?: boolean
          name: string
          play_store_url?: string | null
          product_type?: string
          published_at?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          updated_at?: string
        }
        Update: {
          app_store_url?: string | null
          cover_asset_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          icon_asset_id?: string | null
          id?: string
          is_featured?: boolean
          name?: string
          play_store_url?: string | null
          product_type?: string
          published_at?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_icon_asset_id_fkey"
            columns: ["icon_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_metadata: {
        Row: {
          canonical_url: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          meta_description: string | null
          og_description: string | null
          og_image_id: string | null
          og_title: string | null
          primary_keyword: string | null
          robots: string
          schema_json: Json
          seo_title: string | null
          twitter_card: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          meta_description?: string | null
          og_description?: string | null
          og_image_id?: string | null
          og_title?: string | null
          primary_keyword?: string | null
          robots?: string
          schema_json?: Json
          seo_title?: string | null
          twitter_card?: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          meta_description?: string | null
          og_description?: string | null
          og_image_id?: string | null
          og_title?: string | null
          primary_keyword?: string | null
          robots?: string
          schema_json?: Json
          seo_title?: string | null
          twitter_card?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_metadata_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_redirects: {
        Row: {
          created_at: string
          created_by: string | null
          from_path: string
          id: string
          is_active: boolean
          status_code: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_path: string
          id?: string
          is_active?: boolean
          status_code?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_path?: string
          id?: string
          is_active?: boolean
          status_code?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_features: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          service_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          service_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          service_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_features_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          cover_asset_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_featured: boolean
          name: string
          price_label: string | null
          published_at: string | null
          short_description: string | null
          slug: string
          sort_order: number
          starting_price_cents: number | null
          status: Database["public"]["Enums"]["cms_publish_status"]
          updated_at: string
        }
        Insert: {
          cover_asset_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          name: string
          price_label?: string | null
          published_at?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          starting_price_cents?: number | null
          status?: Database["public"]["Enums"]["cms_publish_status"]
          updated_at?: string
        }
        Update: {
          cover_asset_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          name?: string
          price_label?: string | null
          published_at?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          starting_price_cents?: number | null
          status?: Database["public"]["Enums"]["cms_publish_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_deployments: {
        Row: {
          build_log_url: string | null
          commit_ref: string | null
          created_at: string
          customer_site_deployment_id: string | null
          deployment_url: string | null
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          is_dry_run: boolean
          metadata: Json
          provider_deployment_id: string | null
          publish_target_id: string | null
          queued_at: string
          site_project_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["deployment_status"]
          trigger_type: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          build_log_url?: string | null
          commit_ref?: string | null
          created_at?: string
          customer_site_deployment_id?: string | null
          deployment_url?: string | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          is_dry_run?: boolean
          metadata?: Json
          provider_deployment_id?: string | null
          publish_target_id?: string | null
          queued_at?: string
          site_project_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["deployment_status"]
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          build_log_url?: string | null
          commit_ref?: string | null
          created_at?: string
          customer_site_deployment_id?: string | null
          deployment_url?: string | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          is_dry_run?: boolean
          metadata?: Json
          provider_deployment_id?: string | null
          publish_target_id?: string | null
          queued_at?: string
          site_project_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["deployment_status"]
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_deployments_customer_site_deployment_id_fkey"
            columns: ["customer_site_deployment_id"]
            isOneToOne: false
            referencedRelation: "customer_site_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_deployments_publish_target_id_fkey"
            columns: ["publish_target_id"]
            isOneToOne: false
            referencedRelation: "site_publish_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_deployments_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_dns_instructions: {
        Row: {
          created_at: string
          domain: string
          domain_id: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          generated_at: string
          generated_by: string | null
          id: string
          instruction_version: number
          is_current: boolean
          provider_hint: string
          recommended_domain: string | null
          records: Json
          site_project_id: string | null
          steps: Json
          updated_at: string
          warnings: Json
        }
        Insert: {
          created_at?: string
          domain: string
          domain_id?: string | null
          domain_type: Database["public"]["Enums"]["domain_type"]
          generated_at?: string
          generated_by?: string | null
          id?: string
          instruction_version?: number
          is_current?: boolean
          provider_hint?: string
          recommended_domain?: string | null
          records?: Json
          site_project_id?: string | null
          steps?: Json
          updated_at?: string
          warnings?: Json
        }
        Update: {
          created_at?: string
          domain?: string
          domain_id?: string | null
          domain_type?: Database["public"]["Enums"]["domain_type"]
          generated_at?: string
          generated_by?: string | null
          id?: string
          instruction_version?: number
          is_current?: boolean
          provider_hint?: string
          recommended_domain?: string | null
          records?: Json
          site_project_id?: string | null
          steps?: Json
          updated_at?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_dns_instructions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "site_project_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_dns_instructions_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_dns_provider_guides: {
        Row: {
          body_markdown: string
          created_at: string
          help_url: string | null
          id: string
          provider_key: string
          provider_name: string
          published_at: string | null
          sort_order: number
          status: Database["public"]["Enums"]["cms_publish_status"]
          summary: string | null
          supports_alias_record: boolean
          supports_cname_flattening: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body_markdown?: string
          created_at?: string
          help_url?: string | null
          id?: string
          provider_key: string
          provider_name: string
          published_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          summary?: string | null
          supports_alias_record?: boolean
          supports_cname_flattening?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          help_url?: string | null
          id?: string
          provider_key?: string
          provider_name?: string
          published_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_publish_status"]
          summary?: string | null
          supports_alias_record?: boolean
          supports_cname_flattening?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_domain_check_logs: {
        Row: {
          check_type: string
          checked_at: string
          created_at: string
          domain_id: string
          expected: string | null
          id: string
          message: string | null
          observed: Json
          result: string
          verification_id: string | null
        }
        Insert: {
          check_type: string
          checked_at?: string
          created_at?: string
          domain_id: string
          expected?: string | null
          id?: string
          message?: string | null
          observed?: Json
          result: string
          verification_id?: string | null
        }
        Update: {
          check_type?: string
          checked_at?: string
          created_at?: string
          domain_id?: string
          expected?: string | null
          id?: string
          message?: string | null
          observed?: Json
          result?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_domain_check_logs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "site_project_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_domain_check_logs_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "site_domain_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      site_domain_verifications: {
        Row: {
          attempt_count: number
          created_at: string
          domain_id: string
          expected_value: string
          expires_at: string
          failure_reason: string | null
          id: string
          last_checked_at: string | null
          method: string
          observed_values: string[]
          record_name: string
          record_type: Database["public"]["Enums"]["dns_record_type"]
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          domain_id: string
          expected_value: string
          expires_at?: string
          failure_reason?: string | null
          id?: string
          last_checked_at?: string | null
          method?: string
          observed_values?: string[]
          record_name: string
          record_type?: Database["public"]["Enums"]["dns_record_type"]
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          domain_id?: string
          expected_value?: string
          expires_at?: string
          failure_reason?: string | null
          id?: string
          last_checked_at?: string | null
          method?: string
          observed_values?: string[]
          record_name?: string
          record_type?: Database["public"]["Enums"]["dns_record_type"]
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_domain_verifications_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "site_project_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      site_project_domains: {
        Row: {
          activated_at: string | null
          apex_domain: string
          created_at: string
          created_by: string | null
          domain: string
          domain_type: Database["public"]["Enums"]["domain_type"]
          failure_reason: string | null
          id: string
          is_primary: boolean
          last_checked_at: string | null
          redirect_to_primary: boolean
          removed_at: string | null
          site_project_id: string
          status: Database["public"]["Enums"]["domain_status"]
          subdomain_label: string | null
          updated_at: string
          updated_by: string | null
          verification_token: string
          verified_at: string | null
          workspace_id: string
          www_redirect: string
        }
        Insert: {
          activated_at?: string | null
          apex_domain: string
          created_at?: string
          created_by?: string | null
          domain: string
          domain_type: Database["public"]["Enums"]["domain_type"]
          failure_reason?: string | null
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          redirect_to_primary?: boolean
          removed_at?: string | null
          site_project_id: string
          status?: Database["public"]["Enums"]["domain_status"]
          subdomain_label?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_token: string
          verified_at?: string | null
          workspace_id: string
          www_redirect?: string
        }
        Update: {
          activated_at?: string | null
          apex_domain?: string
          created_at?: string
          created_by?: string | null
          domain?: string
          domain_type?: Database["public"]["Enums"]["domain_type"]
          failure_reason?: string | null
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          redirect_to_primary?: boolean
          removed_at?: string | null
          site_project_id?: string
          status?: Database["public"]["Enums"]["domain_status"]
          subdomain_label?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_token?: string
          verified_at?: string | null
          workspace_id?: string
          www_redirect?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_project_domains_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_project_domains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      site_publish_targets: {
        Row: {
          base_url: string | null
          config: Json
          created_at: string
          domain_id: string | null
          environment: string
          id: string
          is_active: boolean
          provider: string
          provider_project_ref: string | null
          secret_refs: Json
          site_project_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          config?: Json
          created_at?: string
          domain_id?: string | null
          environment?: string
          id?: string
          is_active?: boolean
          provider?: string
          provider_project_ref?: string | null
          secret_refs?: Json
          site_project_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          config?: Json
          created_at?: string
          domain_id?: string | null
          environment?: string
          id?: string
          is_active?: boolean
          provider?: string
          provider_project_ref?: string | null
          secret_refs?: Json
          site_project_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_publish_targets_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "site_project_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_publish_targets_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_ssl_certificates: {
        Row: {
          auto_renew: boolean
          common_name: string | null
          created_at: string
          domain_id: string
          expires_at: string | null
          failure_reason: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          last_checked_at: string | null
          provider: string
          provider_certificate_ref: string | null
          status: Database["public"]["Enums"]["ssl_status"]
          subject_alt_names: string[]
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          common_name?: string | null
          created_at?: string
          domain_id: string
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          last_checked_at?: string | null
          provider?: string
          provider_certificate_ref?: string | null
          status?: Database["public"]["Enums"]["ssl_status"]
          subject_alt_names?: string[]
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          common_name?: string | null
          created_at?: string
          domain_id?: string
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          last_checked_at?: string | null
          provider?: string
          provider_certificate_ref?: string | null
          status?: Database["public"]["Enums"]["ssl_status"]
          subject_alt_names?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_ssl_certificates_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "site_project_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_assets: {
        Row: {
          alt_text: string | null
          asset_role: string
          cms_asset_id: string | null
          created_at: string
          id: string
          sort_order: number
          storage_path: string | null
          template_version_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          asset_role?: string
          cms_asset_id?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string | null
          template_version_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          asset_role?: string
          cms_asset_id?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string | null
          template_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_assets_cms_asset_id_fkey"
            columns: ["cms_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_assets_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_template_category_links: {
        Row: {
          category_id: string
          created_at: string
          sort_order: number
          template_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          sort_order?: number
          template_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "site_template_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_category_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_fields: {
        Row: {
          created_at: string
          default_value: Json | null
          field_key: string
          field_type: Database["public"]["Enums"]["site_field_type"]
          group_label: string | null
          help_text: string | null
          id: string
          is_customer_editable: boolean
          is_required: boolean
          label: string
          options: Json
          placeholder: string | null
          sort_order: number
          template_section_id: string
          template_version_id: string
          updated_at: string
          validation_schema: Json
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          field_key: string
          field_type: Database["public"]["Enums"]["site_field_type"]
          group_label?: string | null
          help_text?: string | null
          id?: string
          is_customer_editable?: boolean
          is_required?: boolean
          label: string
          options?: Json
          placeholder?: string | null
          sort_order?: number
          template_section_id: string
          template_version_id: string
          updated_at?: string
          validation_schema?: Json
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          field_key?: string
          field_type?: Database["public"]["Enums"]["site_field_type"]
          group_label?: string | null
          help_text?: string | null
          id?: string
          is_customer_editable?: boolean
          is_required?: boolean
          label?: string
          options?: Json
          placeholder?: string | null
          sort_order?: number
          template_section_id?: string
          template_version_id?: string
          updated_at?: string
          validation_schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_template_fields_template_section_id_fkey"
            columns: ["template_section_id"]
            isOneToOne: false
            referencedRelation: "site_template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_fields_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_licenses: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          license_scope: string
          purchase_id: string | null
          revoked_at: string | null
          revoked_reason: string | null
          site_project_id: string | null
          source_type: string
          starts_at: string
          status: Database["public"]["Enums"]["template_license_status"]
          template_id: string
          updated_at: string
          user_entitlement_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          license_scope?: string
          purchase_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          site_project_id?: string | null
          source_type: string
          starts_at?: string
          status?: Database["public"]["Enums"]["template_license_status"]
          template_id: string
          updated_at?: string
          user_entitlement_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          license_scope?: string
          purchase_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          site_project_id?: string | null
          source_type?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["template_license_status"]
          template_id?: string
          updated_at?: string
          user_entitlement_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_licenses_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "site_template_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_licenses_site_project_id_fkey"
            columns: ["site_project_id"]
            isOneToOne: false
            referencedRelation: "customer_site_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_licenses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_licenses_user_entitlement_id_fkey"
            columns: ["user_entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_licenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_pages: {
        Row: {
          created_at: string
          default_seo: Json
          id: string
          is_required: boolean
          page_key: string
          page_type: string
          path: string
          sort_order: number
          template_version_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_seo?: Json
          id?: string
          is_required?: boolean
          page_key: string
          page_type?: string
          path: string
          sort_order?: number
          template_version_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_seo?: Json
          id?: string
          is_required?: boolean
          page_key?: string
          page_type?: string
          path?: string
          sort_order?: number
          template_version_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_pages_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_preview_sites: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_built_at: string | null
          preview_slug: string
          preview_url: string | null
          screenshot_asset_id: string | null
          template_id: string
          template_version_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_built_at?: string | null
          preview_slug: string
          preview_url?: string | null
          screenshot_asset_id?: string | null
          template_id: string
          template_version_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_built_at?: string | null
          preview_slug?: string
          preview_url?: string | null
          screenshot_asset_id?: string | null
          template_id?: string
          template_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_preview_sites_screenshot_asset_id_fkey"
            columns: ["screenshot_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_preview_sites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_preview_sites_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_products: {
        Row: {
          commerce_product_id: string
          created_at: string
          id: string
          is_primary: boolean
          relation_type: string
          template_id: string
          updated_at: string
        }
        Insert: {
          commerce_product_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relation_type?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          commerce_product_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relation_type?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_products_commerce_product_id_fkey"
            columns: ["commerce_product_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          order_id: string | null
          order_item_id: string | null
          paid_at: string | null
          refunded_at: string | null
          status: string
          template_id: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          paid_at?: string | null
          refunded_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          paid_at?: string | null
          refunded_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_purchases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_purchases_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_purchases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_purchases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_sections: {
        Row: {
          allowed_variants: string[]
          created_at: string
          default_settings: Json
          description: string | null
          id: string
          is_enabled_by_default: boolean
          is_required: boolean
          name: string
          section_key: string
          section_type: string
          sort_order: number
          template_page_id: string
          template_version_id: string
          updated_at: string
        }
        Insert: {
          allowed_variants?: string[]
          created_at?: string
          default_settings?: Json
          description?: string | null
          id?: string
          is_enabled_by_default?: boolean
          is_required?: boolean
          name: string
          section_key: string
          section_type: string
          sort_order?: number
          template_page_id: string
          template_version_id: string
          updated_at?: string
        }
        Update: {
          allowed_variants?: string[]
          created_at?: string
          default_settings?: Json
          description?: string | null
          id?: string
          is_enabled_by_default?: boolean
          is_required?: boolean
          name?: string
          section_key?: string
          section_type?: string
          sort_order?: number
          template_page_id?: string
          template_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_sections_template_page_id_fkey"
            columns: ["template_page_id"]
            isOneToOne: false
            referencedRelation: "site_template_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_template_sections_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_template_versions: {
        Row: {
          astro_entry_path: string
          changelog: string | null
          created_at: string
          created_by: string | null
          default_content_json: Json
          id: string
          min_platform_version: string | null
          published_at: string | null
          schema_json: Json
          status: string
          template_id: string
          theme_defaults_json: Json
          updated_at: string
          version: string
        }
        Insert: {
          astro_entry_path: string
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          default_content_json?: Json
          id?: string
          min_platform_version?: string | null
          published_at?: string | null
          schema_json?: Json
          status?: string
          template_id: string
          theme_defaults_json?: Json
          updated_at?: string
          version: string
        }
        Update: {
          astro_entry_path?: string
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          default_content_json?: Json
          id?: string
          min_platform_version?: string | null
          published_at?: string | null
          schema_json?: Json
          status?: string
          template_id?: string
          theme_defaults_json?: Json
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_templates: {
        Row: {
          author_name: string | null
          converted_to_public_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_featured: boolean
          latest_version_id: string | null
          metadata: Json
          name: string
          owner_workspace_id: string | null
          preview_image_asset_id: string | null
          pricing_type: Database["public"]["Enums"]["template_pricing_type"]
          published_at: string | null
          required_feature_id: string | null
          short_description: string | null
          site_type: Database["public"]["Enums"]["site_type"]
          slug: string
          sort_order: number
          source_template_id: string | null
          status: Database["public"]["Enums"]["cms_publish_status"]
          template_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_name?: string | null
          converted_to_public_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          latest_version_id?: string | null
          metadata?: Json
          name: string
          owner_workspace_id?: string | null
          preview_image_asset_id?: string | null
          pricing_type?: Database["public"]["Enums"]["template_pricing_type"]
          published_at?: string | null
          required_feature_id?: string | null
          short_description?: string | null
          site_type: Database["public"]["Enums"]["site_type"]
          slug: string
          sort_order?: number
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["cms_publish_status"]
          template_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_name?: string | null
          converted_to_public_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          latest_version_id?: string | null
          metadata?: Json
          name?: string
          owner_workspace_id?: string | null
          preview_image_asset_id?: string | null
          pricing_type?: Database["public"]["Enums"]["template_pricing_type"]
          published_at?: string | null
          required_feature_id?: string | null
          short_description?: string | null
          site_type?: Database["public"]["Enums"]["site_type"]
          slug?: string
          sort_order?: number
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["cms_publish_status"]
          template_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_templates_latest_version_id_fkey"
            columns: ["latest_version_id"]
            isOneToOne: false
            referencedRelation: "site_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_templates_owner_workspace_id_fkey"
            columns: ["owner_workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_templates_preview_image_asset_id_fkey"
            columns: ["preview_image_asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_templates_required_feature_id_fkey"
            columns: ["required_feature_id"]
            isOneToOne: false
            referencedRelation: "entitlement_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_templates_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_cancellations: {
        Row: {
          cancel_type: string
          created_at: string
          effective_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason_code: string | null
          reason_text: string | null
          refund_id: string | null
          requested_by: string | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          cancel_type?: string
          created_at?: string
          effective_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason_code?: string | null
          reason_text?: string | null
          refund_id?: string | null
          requested_by?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          cancel_type?: string
          created_at?: string
          effective_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason_code?: string | null
          reason_text?: string | null
          refund_id?: string | null
          requested_by?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cancellations_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "commerce_refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cancellations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          buyer_name: string | null
          buyer_tax_id: string | null
          created_at: string
          currency: string
          customer_user_id: string
          discount_cents: number
          due_at: string | null
          e_invoice_number: string | null
          e_invoice_status: string | null
          id: string
          invoice_number: string
          metadata: Json
          order_id: string | null
          paid_at: string | null
          payment_id: string | null
          period_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          buyer_name?: string | null
          buyer_tax_id?: string | null
          created_at?: string
          currency?: string
          customer_user_id: string
          discount_cents?: number
          due_at?: string | null
          e_invoice_number?: string | null
          e_invoice_status?: string | null
          id?: string
          invoice_number?: string
          metadata?: Json
          order_id?: string | null
          paid_at?: string | null
          payment_id?: string | null
          period_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          buyer_name?: string | null
          buyer_tax_id?: string | null
          created_at?: string
          currency?: string
          customer_user_id?: string
          discount_cents?: number
          due_at?: string | null
          e_invoice_number?: string | null
          e_invoice_status?: string | null
          id?: string
          invoice_number?: string
          metadata?: Json
          order_id?: string | null
          paid_at?: string | null
          payment_id?: string | null
          period_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "subscription_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_periods: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          payment_id: string | null
          period_end: string
          period_index: number
          period_start: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          period_end: string
          period_index: number
          period_start: string
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          period_end?: string
          period_index?: number
          period_start?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_periods_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_periods_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_periods_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plan_features: {
        Row: {
          created_at: string
          display_label: string | null
          display_value: string | null
          feature_id: string
          id: string
          is_enabled: boolean
          limit_value: number | null
          plan_id: string
          quota_amount: number | null
          quota_period: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_label?: string | null
          display_value?: string | null
          feature_id: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          plan_id: string
          quota_amount?: number | null
          quota_period?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_label?: string | null
          display_value?: string | null
          feature_id?: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          plan_id?: string
          quota_amount?: number | null
          quota_period?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "entitlement_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plan_prices: {
        Row: {
          auto_renew_default: boolean
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          commerce_product_price_id: string
          created_at: string
          ecpay_exec_times: number | null
          ecpay_frequency: number | null
          ecpay_period_type: string | null
          grace_period_days: number
          id: string
          interval_count: number
          is_active: boolean
          max_retry_count: number
          plan_id: string
          updated_at: string
        }
        Insert: {
          auto_renew_default?: boolean
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          commerce_product_price_id: string
          created_at?: string
          ecpay_exec_times?: number | null
          ecpay_frequency?: number | null
          ecpay_period_type?: string | null
          grace_period_days?: number
          id?: string
          interval_count?: number
          is_active?: boolean
          max_retry_count?: number
          plan_id: string
          updated_at?: string
        }
        Update: {
          auto_renew_default?: boolean
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          commerce_product_price_id?: string
          created_at?: string
          ecpay_exec_times?: number | null
          ecpay_frequency?: number | null
          ecpay_period_type?: string | null
          grace_period_days?: number
          id?: string
          interval_count?: number
          is_active?: boolean
          max_retry_count?: number
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_prices_commerce_product_price_id_fkey"
            columns: ["commerce_product_price_id"]
            isOneToOne: true
            referencedRelation: "commerce_product_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          commerce_product_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entitlement_product_id: string
          id: string
          is_active: boolean
          is_public: boolean
          max_site_projects: number
          metadata: Json
          name: string
          plan_key: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          site_type: Database["public"]["Enums"]["site_type"] | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commerce_product_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entitlement_product_id: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          max_site_projects?: number
          metadata?: Json
          name: string
          plan_key: string
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          site_type?: Database["public"]["Enums"]["site_type"] | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commerce_product_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entitlement_product_id?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          max_site_projects?: number
          metadata?: Json
          name?: string
          plan_key?: string
          product_code?: Database["public"]["Enums"]["commerce_product_code"]
          site_type?: Database["public"]["Enums"]["site_type"] | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_commerce_product_id_fkey"
            columns: ["commerce_product_id"]
            isOneToOne: false
            referencedRelation: "commerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plans_entitlement_product_id_fkey"
            columns: ["entitlement_product_id"]
            isOneToOne: false
            referencedRelation: "entitlement_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          access_code_id: string | null
          created_at: string
          customer_subscription_id: string | null
          entitlement_product_id: string
          expires_at: string | null
          granted_by: string | null
          id: string
          metadata: Json
          order_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_type: string
          starts_at: string
          status: Database["public"]["Enums"]["entitlement_status"]
          suspended_at: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_code_id?: string | null
          created_at?: string
          customer_subscription_id?: string | null
          entitlement_product_id: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_type: string
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_code_id?: string | null
          created_at?: string
          customer_subscription_id?: string | null
          entitlement_product_id?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_type?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: true
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_entitlement_product_id_fkey"
            columns: ["entitlement_product_id"]
            isOneToOne: false
            referencedRelation: "entitlement_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "customer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _redeem_access_code_internal: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      _site_create_entitlement: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      accept_workspace_invitation: { Args: { token: string }; Returns: Json }
      add_site_project_domain: {
        Args: {
          domain: string
          make_primary?: boolean
          site_project_id: string
        }
        Returns: Json
      }
      can_access_ai_workspace: {
        Args: { roles: string[]; workspace_id: string }
        Returns: boolean
      }
      can_create_site_project: {
        Args: { workspace_id: string }
        Returns: boolean
      }
      can_edit_site_project: {
        Args: { site_project_id: string }
        Returns: boolean
      }
      can_manage_site_project: {
        Args: { site_project_id: string }
        Returns: boolean
      }
      can_publish_content: { Args: never; Returns: boolean }
      can_read_site_project: {
        Args: { site_project_id: string }
        Returns: boolean
      }
      can_use_template: {
        Args: { site_project_id: string; template_id: string }
        Returns: boolean
      }
      can_workspace_use_template: {
        Args: {
          site_project_id?: string
          template_id: string
          workspace_id: string
        }
        Returns: boolean
      }
      consume_ai_article_credits: {
        Args: { credits?: number; generation_id: string }
        Returns: Json
      }
      consume_usage_quota: {
        Args: {
          amount: number
          entitlement_id: string
          idempotency_key?: string
          usage_key: string
        }
        Returns: Json
      }
      create_site_project_from_template: {
        Args: {
          project_name?: string
          template_id: string
          workspace_id: string
        }
        Returns: string
      }
      create_workspace_from_access_code: {
        Args: { code: string; workspace_name?: string }
        Returns: Json
      }
      create_workspace_invitation: {
        Args: {
          email: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          workspace_id: string
        }
        Returns: Json
      }
      current_admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["cms_admin_role"]
      }
      current_workspace_role: {
        Args: { workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_member_role"]
      }
      generate_access_code: { Args: { product_code: string }; Returns: string }
      generate_dns_instruction: { Args: { domain: string }; Returns: Json }
      get_bank_transfer_instructions: {
        Args: { order_id: string }
        Returns: Json
      }
      get_enabled_payment_methods: {
        Args: never
        Returns: {
          description: string
          display_name: string
          max_amount_cents: number
          method_key: string
          method_type: Database["public"]["Enums"]["payment_method_type"]
          min_amount_cents: number
          provider: Database["public"]["Enums"]["payment_provider"]
          public_settings: Json
          sort_order: number
          supported_intervals: Database["public"]["Enums"]["billing_interval"][]
          supports_one_time: boolean
          supports_recurring: boolean
        }[]
      }
      has_active_entitlement: {
        Args: { feature_key: string; user_id: string }
        Returns: boolean
      }
      has_admin_role: {
        Args: { allowed: Database["public"]["Enums"]["cms_admin_role"][] }
        Returns: boolean
      }
      has_workspace_role: {
        Args: { roles: string[]; workspace_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_cms_staff: { Args: never; Returns: boolean }
      is_internal_context: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_publicly_visible: {
        Args: {
          published_at: string
          s: Database["public"]["Enums"]["cms_publish_status"]
          scheduled_at?: string
        }
        Returns: boolean
      }
      is_service_role: { Args: never; Returns: boolean }
      is_site_publicly_visible: {
        Args: { site_project_id: string }
        Returns: boolean
      }
      is_valid_secret_refs: { Args: { refs: Json }; Returns: boolean }
      is_workspace_member: { Args: { workspace_id: string }; Returns: boolean }
      issue_access_code: {
        Args: {
          p_customer_subscription_id?: string
          p_entitlement_product_id: string
          p_expires_at?: string
          p_issued_to_email?: string
          p_issued_to_user_id?: string
          p_metadata?: Json
          p_order_id?: string
          p_order_item_id?: string
          p_source_type?: string
        }
        Returns: {
          code: string
          code_year: number
          created_at: string
          created_by: string | null
          customer_subscription_id: string | null
          entitlement_duration_days: number | null
          entitlement_product_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          issued_to_email: string | null
          issued_to_user_id: string | null
          last_transferred_at: string | null
          metadata: Json
          order_id: string | null
          order_item_id: string | null
          product_code: Database["public"]["Enums"]["commerce_product_code"]
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          redeemed_workspace_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_type: string
          starts_at: string | null
          status: Database["public"]["Enums"]["access_code_status"]
          transfer_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "access_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      jsonb_has_secret_like_keys: { Args: { doc: Json }; Returns: boolean }
      mark_payment_success_and_issue_entitlement: {
        Args: {
          note?: string
          order_id: string
          payment_id?: string
          provider_trade_no?: string
        }
        Returns: Json
      }
      normalize_access_code: { Args: { input: string }; Returns: string }
      normalize_domain_name: { Args: { input: string }; Returns: string }
      platform_feature_enabled: { Args: { flag: string }; Returns: boolean }
      publish_site_project: { Args: { site_project_id: string }; Returns: Json }
      record_subscription_renewal: {
        Args: { payment_id: string; subscription_id: string }
        Returns: Json
      }
      redeem_access_code: { Args: { code: string }; Returns: Json }
      request_ip_hash: { Args: never; Returns: string }
      request_subscription_cancellation: {
        Args: {
          cancel_type?: string
          reason_code?: string
          reason_text?: string
          subscription_id: string
        }
        Returns: Json
      }
      request_user_agent: { Args: never; Returns: string }
      revoke_access_code: {
        Args: { code: string; reason?: string }
        Returns: Json
      }
      run_entitlement_expiry_job: { Args: never; Returns: Json }
      site_project_workspace_id: {
        Args: { site_project_id: string }
        Returns: string
      }
      submit_site_form: {
        Args: {
          form_key: string
          honeypot?: string
          payload: Json
          site_project_id: string
          source_path?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
        }
        Returns: Json
      }
      transfer_access_code: {
        Args: { code: string; recipient_email: string }
        Returns: Json
      }
      try_uuid: { Args: { value: string }; Returns: string }
      workspace_active_owner_count: {
        Args: { p_exclude_member_id: string; p_workspace_id: string }
        Returns: number
      }
      workspace_has_feature: {
        Args: { feature_key: string; workspace_id: string }
        Returns: boolean
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_actor_type?: string
          p_after?: Json
          p_before?: Json
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_workspace_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      access_code_status:
        | "generated"
        | "issued"
        | "redeemed"
        | "expired"
        | "revoked"
      ai_content_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "rejected"
        | "archived"
      ai_export_format: "markdown" | "html" | "wordpress_html" | "json_ld"
      ai_generation_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      billing_interval: "one_time" | "month" | "year"
      checkout_session_status: "open" | "completed" | "expired" | "cancelled"
      cms_admin_role: "owner" | "admin" | "editor" | "author" | "viewer"
      cms_publish_status:
        | "draft"
        | "review"
        | "scheduled"
        | "published"
        | "archived"
      cms_visibility: "all" | "desktop" | "mobile"
      commerce_product_code: "SEO" | "LP" | "ECOM" | "DM" | "AI" | "CUSTOM"
      deployment_status:
        | "queued"
        | "building"
        | "ready"
        | "failed"
        | "cancelled"
        | "skipped"
      dns_record_type: "CNAME" | "TXT" | "A" | "AAAA" | "ALIAS"
      domain_status:
        | "pending"
        | "verifying"
        | "verified"
        | "active"
        | "failed"
        | "removed"
      domain_type: "platform_subdomain" | "custom_subdomain" | "custom_apex"
      entitlement_status: "active" | "suspended" | "expired" | "revoked"
      external_connection_status:
        | "pending_audit"
        | "discovered"
        | "connected"
        | "syncing"
        | "paused"
        | "disconnected"
        | "error"
      inquiry_status: "new" | "contacted" | "qualified" | "closed" | "spam"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      invoice_status: "draft" | "open" | "paid" | "void" | "uncollectible"
      order_status:
        | "pending"
        | "awaiting_payment"
        | "paid"
        | "fulfilled"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
        | "failed"
      payment_method_type:
        | "credit_card"
        | "credit_card_recurring"
        | "atm_virtual_account"
        | "web_atm"
        | "bank_transfer"
        | "linepay"
        | "manual"
      payment_provider: "ecpay" | "linepay" | "bank_transfer" | "manual"
      payment_status:
        | "pending"
        | "processing"
        | "awaiting_transfer"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "expired"
        | "refunded"
        | "partially_refunded"
      provider_environment: "sandbox" | "production"
      refund_status:
        | "requested"
        | "approved"
        | "processing"
        | "succeeded"
        | "failed"
        | "rejected"
        | "cancelled"
      site_content_state: "draft" | "published"
      site_field_type:
        | "text"
        | "textarea"
        | "rich_text"
        | "markdown"
        | "image"
        | "gallery"
        | "link"
        | "button"
        | "number"
        | "boolean"
        | "select"
        | "color"
        | "repeater"
        | "json"
      site_project_status:
        | "draft"
        | "preview"
        | "published"
        | "suspended"
        | "archived"
      site_type: "seo_website" | "landing_page" | "ecommerce" | "dm_page"
      ssl_status:
        | "not_requested"
        | "pending"
        | "provisioning"
        | "active"
        | "failed"
        | "expired"
      subscription_status:
        | "incomplete"
        | "trialing"
        | "active"
        | "past_due"
        | "cancel_scheduled"
        | "cancelled"
        | "expired"
      template_license_status: "active" | "expired" | "revoked"
      template_pricing_type: "free" | "paid" | "plan_restricted" | "private"
      webhook_processing_status:
        | "received"
        | "processing"
        | "processed"
        | "failed"
        | "ignored"
      workspace_member_role: "owner" | "admin" | "editor" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      access_code_status: [
        "generated",
        "issued",
        "redeemed",
        "expired",
        "revoked",
      ],
      ai_content_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "rejected",
        "archived",
      ],
      ai_export_format: ["markdown", "html", "wordpress_html", "json_ld"],
      ai_generation_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      billing_interval: ["one_time", "month", "year"],
      checkout_session_status: ["open", "completed", "expired", "cancelled"],
      cms_admin_role: ["owner", "admin", "editor", "author", "viewer"],
      cms_publish_status: [
        "draft",
        "review",
        "scheduled",
        "published",
        "archived",
      ],
      cms_visibility: ["all", "desktop", "mobile"],
      commerce_product_code: ["SEO", "LP", "ECOM", "DM", "AI", "CUSTOM"],
      deployment_status: [
        "queued",
        "building",
        "ready",
        "failed",
        "cancelled",
        "skipped",
      ],
      dns_record_type: ["CNAME", "TXT", "A", "AAAA", "ALIAS"],
      domain_status: [
        "pending",
        "verifying",
        "verified",
        "active",
        "failed",
        "removed",
      ],
      domain_type: ["platform_subdomain", "custom_subdomain", "custom_apex"],
      entitlement_status: ["active", "suspended", "expired", "revoked"],
      external_connection_status: [
        "pending_audit",
        "discovered",
        "connected",
        "syncing",
        "paused",
        "disconnected",
        "error",
      ],
      inquiry_status: ["new", "contacted", "qualified", "closed", "spam"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      invoice_status: ["draft", "open", "paid", "void", "uncollectible"],
      order_status: [
        "pending",
        "awaiting_payment",
        "paid",
        "fulfilled",
        "cancelled",
        "refunded",
        "partially_refunded",
        "failed",
      ],
      payment_method_type: [
        "credit_card",
        "credit_card_recurring",
        "atm_virtual_account",
        "web_atm",
        "bank_transfer",
        "linepay",
        "manual",
      ],
      payment_provider: ["ecpay", "linepay", "bank_transfer", "manual"],
      payment_status: [
        "pending",
        "processing",
        "awaiting_transfer",
        "succeeded",
        "failed",
        "cancelled",
        "expired",
        "refunded",
        "partially_refunded",
      ],
      provider_environment: ["sandbox", "production"],
      refund_status: [
        "requested",
        "approved",
        "processing",
        "succeeded",
        "failed",
        "rejected",
        "cancelled",
      ],
      site_content_state: ["draft", "published"],
      site_field_type: [
        "text",
        "textarea",
        "rich_text",
        "markdown",
        "image",
        "gallery",
        "link",
        "button",
        "number",
        "boolean",
        "select",
        "color",
        "repeater",
        "json",
      ],
      site_project_status: [
        "draft",
        "preview",
        "published",
        "suspended",
        "archived",
      ],
      site_type: ["seo_website", "landing_page", "ecommerce", "dm_page"],
      ssl_status: [
        "not_requested",
        "pending",
        "provisioning",
        "active",
        "failed",
        "expired",
      ],
      subscription_status: [
        "incomplete",
        "trialing",
        "active",
        "past_due",
        "cancel_scheduled",
        "cancelled",
        "expired",
      ],
      template_license_status: ["active", "expired", "revoked"],
      template_pricing_type: ["free", "paid", "plan_restricted", "private"],
      webhook_processing_status: [
        "received",
        "processing",
        "processed",
        "failed",
        "ignored",
      ],
      workspace_member_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const

