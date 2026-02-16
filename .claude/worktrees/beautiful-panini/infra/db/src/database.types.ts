// Generated types for Supabase schema.
// In production, regenerate with: supabase gen types typescript --local > src/database.types.ts
// This file provides the type contract between the DB and app layers.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = "owner" | "admin" | "member";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrgRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrgRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trips_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      day_plans: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          date: string;
          day_number: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          date: string;
          day_number: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          date?: string;
          day_number?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "day_plans_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "day_plans_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      places: {
        Row: {
          id: string;
          organization_id: string;
          day_plan_id: string;
          name: string;
          lat: number;
          lng: number;
          address: string | null;
          category: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          day_plan_id: string;
          name: string;
          lat: number;
          lng: number;
          address?: string | null;
          category?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          day_plan_id?: string;
          name?: string;
          lat?: number;
          lng?: number;
          address?: string | null;
          category?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "places_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "places_day_plan_id_fkey";
            columns: ["day_plan_id"];
            isOneToOne: false;
            referencedRelation: "day_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      routes: {
        Row: {
          id: string;
          organization_id: string;
          day_plan_id: string;
          origin_place_id: string;
          dest_place_id: string;
          selected_alternative_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          day_plan_id: string;
          origin_place_id: string;
          dest_place_id: string;
          selected_alternative_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          day_plan_id?: string;
          origin_place_id?: string;
          dest_place_id?: string;
          selected_alternative_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "routes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routes_day_plan_id_fkey";
            columns: ["day_plan_id"];
            isOneToOne: false;
            referencedRelation: "day_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      route_alternatives: {
        Row: {
          id: string;
          organization_id: string;
          route_id: string;
          label: string | null;
          geometry: Json;
          distance_meters: number;
          duration_seconds: number;
          provider: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          route_id: string;
          label?: string | null;
          geometry: Json;
          distance_meters: number;
          duration_seconds: number;
          provider: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          route_id?: string;
          label?: string | null;
          geometry?: Json;
          distance_meters?: number;
          duration_seconds?: number;
          provider?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_alternatives_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_alternatives_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_skeletons: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          name: Json | null;
          start_date: Json | null;
          end_date: Json | null;
          arrival_airport: Json | null;
          departure_airport: Json | null;
          party_size: Json | null;
          party_description: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          name?: Json | null;
          start_date?: Json | null;
          end_date?: Json | null;
          arrival_airport?: Json | null;
          departure_airport?: Json | null;
          party_size?: Json | null;
          party_description?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          name?: Json | null;
          start_date?: Json | null;
          end_date?: Json | null;
          arrival_airport?: Json | null;
          departure_airport?: Json | null;
          party_size?: Json | null;
          party_description?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_skeletons_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_skeletons_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: true;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      bases: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          name: Json;
          location: Json;
          nights: Json;
          check_in: Json | null;
          check_out: Json | null;
          booked: Json;
          cost_per_night: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          name: Json;
          location: Json;
          nights: Json;
          check_in?: Json | null;
          check_out?: Json | null;
          booked: Json;
          cost_per_night?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          name?: Json;
          location?: Json;
          nights?: Json;
          check_in?: Json | null;
          check_out?: Json | null;
          booked?: Json;
          cost_per_night?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bases_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bases_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          name: Json;
          location: Json;
          day_index: Json | null;
          time_block: Json | null;
          priority: Json;
          duration: Json | null;
          cost: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          name: Json;
          location: Json;
          day_index?: Json | null;
          time_block?: Json | null;
          priority: Json;
          duration?: Json | null;
          cost?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          name?: Json;
          location?: Json;
          day_index?: Json | null;
          time_block?: Json | null;
          priority?: Json;
          duration?: Json | null;
          cost?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_legs: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          from_id: string;
          to_id: string;
          distance: Json | null;
          duration: Json | null;
          depart_by: Json | null;
          route_geojson: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          from_id: string;
          to_id: string;
          distance?: Json | null;
          duration?: Json | null;
          depart_by?: Json | null;
          route_geojson?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          from_id?: string;
          to_id?: string;
          distance?: Json | null;
          duration?: Json | null;
          depart_by?: Json | null;
          route_geojson?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drive_legs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drive_legs_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      day_schedules: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          day_index: number;
          base_id: string | null;
          morning: Json;
          afternoon: Json;
          evening: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          day_index: number;
          base_id?: string | null;
          morning?: Json;
          afternoon?: Json;
          evening?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          day_index?: number;
          base_id?: string | null;
          morning?: Json;
          afternoon?: Json;
          evening?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "day_schedules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "day_schedules_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "day_schedules_base_id_fkey";
            columns: ["base_id"];
            isOneToOne: false;
            referencedRelation: "bases";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_categories: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          category: string;
          estimated: Json | null;
          actual: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          category: string;
          estimated?: Json | null;
          actual?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          category?: string;
          estimated?: Json | null;
          actual?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_categories_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      finalizations: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          emergency_contact: Json | null;
          packing_list: Json;
          offline_notes: Json;
          confirmations: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          emergency_contact?: Json | null;
          packing_list?: Json;
          offline_notes?: Json;
          confirmations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          trip_id?: string;
          emergency_contact?: Json | null;
          packing_list?: Json;
          offline_notes?: Json;
          confirmations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finalizations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finalizations_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: true;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      get_org_role: {
        Args: { org_id: string };
        Returns: OrgRole;
      };
    };
    Enums: {
      org_role: OrgRole;
      provenance:
        | "user-confirmed"
        | "user-entered"
        | "ai-proposed"
        | "system-derived";
      time_block: "morning" | "afternoon" | "evening" | "flexible";
      activity_priority: "must-do" | "nice-to-have" | "if-time";
    };
    CompositeTypes: Record<string, never>;
  };
}
