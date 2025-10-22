export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          attempts: number | null
          created_at: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          id: string
          lesson_id: string
          max_grade: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          text_answer: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          lesson_id: string
          max_grade?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          text_answer?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          lesson_id?: string
          max_grade?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          text_answer?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          progress_percent: number | null
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          progress_percent?: number | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          progress_percent?: number | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string | null
          id: string
          poster_2x3_url: string | null
          program_id: string | null
          published_at: string | null
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string | null
          wide_11x6_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          poster_2x3_url?: string | null
          program_id?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string | null
          wide_11x6_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          poster_2x3_url?: string | null
          program_id?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string | null
          wide_11x6_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string | null
          id: string
          program_id: string
          progress_percent: number | null
          status: Database["public"]["Enums"]["enrollment_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id: string
          progress_percent?: number | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string
          progress_percent?: number | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notifications: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          notification_type: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          notification_type?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          notification_type?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          end_at: string
          id: string
          meeting_url: string | null
          start_at: string
          title: string
          visibility: Database["public"]["Enums"]["event_visibility"] | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          end_at: string
          id?: string
          meeting_url?: string | null
          start_at: string
          title: string
          visibility?: Database["public"]["Enums"]["event_visibility"] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          end_at?: string
          id?: string
          meeting_url?: string | null
          start_at?: string
          title?: string
          visibility?: Database["public"]["Enums"]["event_visibility"] | null
        }
        Relationships: []
      }
      forum_post_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          post_id?: string
        }
        Relationships: []
      }
      forum_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_post_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string
          forum_id: string | null
          id: string
          pinned: boolean | null
          program_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          forum_id?: string | null
          id?: string
          pinned?: boolean | null
          program_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          forum_id?: string | null
          id?: string
          pinned?: boolean | null
          program_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      forums: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          program_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          program_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lesson_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_courses_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_materials: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          lesson_id: string
          sort_order: number
          title: string
          type: Database["public"]["Enums"]["material_type"]
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          lesson_id: string
          sort_order?: number
          title: string
          type: Database["public"]["Enums"]["material_type"]
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          lesson_id?: string
          sort_order?: number
          title?: string
          type?: Database["public"]["Enums"]["material_type"]
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          approved: boolean | null
          completed: boolean | null
          completed_at: string | null
          lesson_id: string
          started_at: string | null
          updated_at: string | null
          user_id: string
          watched_seconds: number | null
        }
        Insert: {
          approved?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          lesson_id: string
          started_at?: string | null
          updated_at?: string | null
          user_id: string
          watched_seconds?: number | null
        }
        Update: {
          approved?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          lesson_id?: string
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          approval_form_url: string | null
          assignment_instructions: string | null
          course_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          has_assignment: boolean | null
          has_materials: boolean | null
          id: string
          prerequisite_lesson_id: string | null
          requires_admin_approval: boolean | null
          slug: string
          sort_order: number
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          approval_form_url?: string | null
          assignment_instructions?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          has_assignment?: boolean | null
          has_materials?: boolean | null
          id?: string
          prerequisite_lesson_id?: string | null
          requires_admin_approval?: boolean | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          approval_form_url?: string | null
          assignment_instructions?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          has_assignment?: boolean | null
          has_materials?: boolean | null
          id?: string
          prerequisite_lesson_id?: string | null
          requires_admin_approval?: boolean | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_prerequisite_lesson_id_fkey"
            columns: ["prerequisite_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      program_courses: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          program_id: string
          sort_order: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          program_id: string
          sort_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          program_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          id: string
          poster_2x3_url: string | null
          published_at: string | null
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string | null
          wide_11x6_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          poster_2x3_url?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string | null
          wide_11x6_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          poster_2x3_url?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string | null
          wide_11x6_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_simple: {
        Args: { user_id: string }
        Returns: {
          success: boolean
          message?: string
          error?: string
          email?: string
        }
      }
      get_course_progress: {
        Args: { _course_id: string; _user_id: string }
        Returns: {
          completed_lessons: number
          progress_percent: number
          total_lessons: number
        }[]
      }
      get_users_with_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_lesson_unlocked: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      assignment_status: "submitted" | "reviewing" | "approved" | "rejected"
      enrollment_status: "active" | "completed" | "canceled"
      event_visibility: "all" | "students" | "teachers"
      material_type: "file" | "link"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "admin"],
      assignment_status: ["submitted", "reviewing", "approved", "rejected"],
      enrollment_status: ["active", "completed", "canceled"],
      event_visibility: ["all", "students", "teachers"],
      material_type: ["file", "link"],
    },
  },
} as const
