// TODO: Supabase CLI で自動生成する
// npx supabase gen types typescript --project-id <project-id> > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          store_id: string;
          table_number: number;
          token: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          table_number: number;
          token?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          table_number?: number;
          token?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          store_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_available: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          store_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          store_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          store_id: string;
          table_id: string | null;
          order_number: number;
          status: string;
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          table_id?: string | null;
          order_number?: number;
          status?: string;
          total_amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          table_id?: string | null;
          order_number?: number;
          status?: string;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          quantity: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          quantity?: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          name?: string;
          price?: number;
          quantity?: number;
        };
      };
    };
    Functions: {
      create_order: {
        Args: {
          p_store_id: string;
          p_table_id: string;
          p_items: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}
