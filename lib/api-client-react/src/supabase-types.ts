// Minimal Supabase Database types matching the QUANTEX schema.
// Replace with `supabase gen types typescript` after creating the Supabase project for full type safety.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          role: string;
          phone: string | null;
          address: string | null;
          avatar_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          role: string;
          phone?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          role?: string;
          phone?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
        };
      };
      technicians: {
        Row: {
          id: number;
          user_id: string;
          name: string | null;
          bio: string | null;
          avatar_url: string | null;
          profile_picture_url: string | null;
          skills: string[];
          rating: number | null;
          review_count: number | null;
          is_available: boolean | null;
          completed_jobs: number | null;
          hourly_rate: number | null;
          response_time: string | null;
          latitude: number | null;
          longitude: number | null;
          last_location_at: string | null;
          current_status: string | null;
          verification_badges: string[];
          category_ids: number[];
          profession: string[];
          services_offered: Record<string, unknown> | null;
          years_experience: number | null;
          certifications: string[];
          previous_company: string | null;
          areas_of_expertise: string[];
          languages_spoken: string[];
          visit_charge: number | null;
          per_job_rate: number | null;
          inspection_charge: number | null;
          emergency_charge: number | null;
          weekend_charge: number | null;
          night_charge: number | null;
          working_days: string[];
          working_hours_start: string | null;
          working_hours_end: string | null;
          emergency_available: boolean | null;
          vacation_mode: boolean | null;
          max_daily_bookings: number | null;
          service_radius: number | null;
          service_city: string | null;
          pin_code: string | null;
          gender: string | null;
          date_of_birth: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          profile_picture_url?: string | null;
          skills?: string[];
          rating?: number | null;
          review_count?: number | null;
          is_available?: boolean | null;
          completed_jobs?: number | null;
          hourly_rate?: number | null;
          response_time?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          last_location_at?: string | null;
          current_status?: string | null;
          verification_badges?: string[];
          category_ids?: number[];
          profession?: string[];
          services_offered?: Record<string, unknown> | null;
          years_experience?: number | null;
          certifications?: string[];
          previous_company?: string | null;
          areas_of_expertise?: string[];
          languages_spoken?: string[];
          visit_charge?: number | null;
          per_job_rate?: number | null;
          inspection_charge?: number | null;
          emergency_charge?: number | null;
          weekend_charge?: number | null;
          night_charge?: number | null;
          working_days?: string[];
          working_hours_start?: string | null;
          working_hours_end?: string | null;
          emergency_available?: boolean | null;
          vacation_mode?: boolean | null;
          max_daily_bookings?: number | null;
          service_radius?: number | null;
          service_city?: string | null;
          pin_code?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          created_at?: string | null;
        };
        Update: {
          [key: string]: unknown;
        };
      };
      bookings: {
        Row: {
          id: number;
          customer_id: string;
          technician_id: number | null;
          category_id: number;
          status: string;
          issue_description: string | null;
          address: string | null;
          scheduled_at: string | null;
          estimated_cost: number | null;
          final_cost: number | null;
          notes: string | null;
          dest_latitude: number | null;
          dest_longitude: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          customer_id: string;
          technician_id?: number | null;
          category_id: number;
          status?: string;
          issue_description?: string | null;
          address?: string | null;
          scheduled_at?: string | null;
          estimated_cost?: number | null;
          final_cost?: number | null;
          notes?: string | null;
          dest_latitude?: number | null;
          dest_longitude?: number | null;
          created_at?: string | null;
        };
        Update: {
          [key: string]: unknown;
        };
      };
      reviews: {
        Row: {
          id: number;
          customer_id: string;
          technician_id: number;
          booking_id: number;
          rating: number;
          comment: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          customer_id: string;
          technician_id: number;
          booking_id: number;
          rating: number;
          comment?: string | null;
          created_at?: string | null;
        };
        Update: {
          [key: string]: unknown;
        };
      };
      service_categories: {
        Row: {
          id: number;
          name: string;
          icon: string | null;
          description: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          icon?: string | null;
          description?: string | null;
        };
        Update: {
          [key: string]: unknown;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
