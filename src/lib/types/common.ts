/**
 * Tipos compartidos usados en múltiples partes de la aplicación
 */

export type UserRole = 'admin' | 'formador' | 'profesor' | 'teacher' | 'voluntario' | 'student' | 'estudiante';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role?: UserRole;
  created_at?: string;
}

export interface Assignment {
  id: string;
  lesson_id: string;
  user_id: string;
  status: 'submitted' | 'approved' | 'rejected' | 'reviewing';
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  file_url: string | null;
  text_answer: string | null;
  created_at: string;
  updated_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface AssignmentWithDetails extends Assignment {
  user_profile: {
    full_name: string;
  };
  lesson: {
    title: string;
    course: {
      title: string;
    };
  };
}

export interface LessonMaterial {
  id: string;
  title: string;
  type: 'file' | 'link';
  file_url?: string;
  url?: string;
}

export interface Course {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  poster_2x3_url?: string | null;
  wide_11x6_url?: string | null;
  published_at?: string | null;
}

export interface Program {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  poster_2x3_url?: string | null;
  wide_11x6_url?: string | null;
  published_at?: string | null;
}
