/**
 * Database types.
 *
 * Mirrors supabase/migrations/*.sql. Regenerate after any schema change with:
 *
 *   npm run db:types
 *
 * which overwrites this file from the live schema — so the database stays the
 * single source of truth and a column rename becomes a compile error in the UI
 * rather than an undefined at runtime.
 */

export type ActivityType =
  | 'spraying'
  | 'harvesting'
  | 'planting'
  | 'irrigation'
  | 'fertilizing'
  | 'scouting'
  | 'tilling'
  | 'maintenance';

/** GeoJSON Polygon ring: [[[lng, lat], ...]] */
export type PolygonBoundary = [number, number][][];

/**
 * Shorthand for one foreign-key entry. supabase-js reads these to type joined
 * selects like `.select('*, employees(full_name)')`; without them such a
 * select resolves to `never`. The generator spells each one out longhand —
 * this alias just keeps the hand-maintained copy readable.
 */
type FK<Name extends string, Col extends string, Rel extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Rel;
  referencedColumns: ['id'];
};

export interface Database {
  public: {
    Tables: {
      farms: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          farm_id: string;
          full_name: string;
          role: string;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          full_name: string;
          role?: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
        Relationships: [FK<'employees_farm_id_fkey', 'farm_id', 'farms'>];
      };
      fields: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          boundary: PolygonBoundary;
          center_lat: number;
          center_lng: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          boundary: PolygonBoundary;
          center_lat: number;
          center_lng: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fields']['Insert']>;
        Relationships: [FK<'fields_farm_id_fkey', 'farm_id', 'farms'>];
      };
      chemicals: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          category: string | null;
          rei_hours: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          category?: string | null;
          rei_hours?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chemicals']['Insert']>;
        Relationships: [FK<'chemicals_farm_id_fkey', 'farm_id', 'farms'>];
      };
      logs: {
        Row: {
          id: string;
          farm_id: string;
          employee_id: string;
          field_id: string;
          chemical_id: string | null;
          activity: ActivityType;
          log_date: string;
          start_time: string;
          end_time: string;
          audio_url: string | null;
          audio_duration_seconds: number | null;
          transcript: string | null;
          summary: string | null;
          transcription_confidence: number | null;
          is_reviewed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          employee_id: string;
          field_id: string;
          chemical_id?: string | null;
          activity: ActivityType;
          log_date: string;
          start_time: string;
          end_time: string;
          audio_url?: string | null;
          audio_duration_seconds?: number | null;
          transcript?: string | null;
          summary?: string | null;
          transcription_confidence?: number | null;
          is_reviewed?: boolean;
          created_at?: string;
        };
        /**
         * Only is_reviewed is writable from the browser — see the column-level
         * grant in 0002_rls.sql. Narrowing the type here makes that boundary
         * visible at the call site instead of only failing at the database.
         */
        Update: { is_reviewed?: boolean };
        Relationships: [
          FK<'logs_farm_id_fkey', 'farm_id', 'farms'>,
          FK<'logs_employee_id_fkey', 'employee_id', 'employees'>,
          FK<'logs_field_id_fkey', 'field_id', 'fields'>,
          FK<'logs_chemical_id_fkey', 'chemical_id', 'chemicals'>,
        ];
      };
      tags: {
        Row: { id: string; farm_id: string; label: string; created_at: string };
        Insert: { id?: string; farm_id: string; label: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
        Relationships: [FK<'tags_farm_id_fkey', 'farm_id', 'farms'>];
      };
      log_tags: {
        Row: { log_id: string; tag_id: string; created_at: string };
        Insert: { log_id: string; tag_id: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['log_tags']['Insert']>;
        Relationships: [
          FK<'log_tags_log_id_fkey', 'log_id', 'logs'>,
          FK<'log_tags_tag_id_fkey', 'tag_id', 'tags'>,
        ];
      };
    };
    Views: {
      /** See supabase/migrations/0003_dashboard_stats.sql */
      dashboard_stats: {
        Row: {
          farm_id: string;
          todays_recordings: number;
          new_today: number;
          active_workers: number;
          response_accuracy: number | null;
          unreviewed_logs: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: { activity_type: ActivityType };
    CompositeTypes: Record<string, never>;
  };
}
