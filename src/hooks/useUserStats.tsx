import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserStats {
  total_programs: number;
  active_programs: number;
  completed_lessons: number;
  total_study_time: number; // en minutos
  certificates: number;
  current_lesson?: {
    id: string;
    title: string;
    course_title: string;
    progress_percent: number;
    remaining_minutes: number;
  };
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>({
    total_programs: 0,
    active_programs: 0,
    completed_lessons: 0,
    total_study_time: 0,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Obtener progreso de lecciones completadas
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select(`
          completed,
          watched_seconds,
          lesson:lessons (
            id,
            title,
            duration_minutes,
            lesson_courses (
              courses (
                id,
                title,
                program_courses (
                  programs (
                    id,
                    title
                  )
                )
              )
            )
          )
        `)
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Calcular estadísticas
      const completedLessons = progressData?.filter(p => p.completed) || [];
      const totalStudyTime = progressData?.reduce((total, p) => {
        return total + Math.floor((p.watched_seconds || 0) / 60);
      }, 0) || 0;

      // Obtener programas únicos con progreso
      const programsWithProgress = new Set();
      const activeProgramIds = new Set();
      
      progressData?.forEach(p => {
        // Handle the new nested structure for courses and programs
        const courseData = p.lesson?.lesson_courses?.[0]?.courses;
        const programData = courseData?.program_courses?.[0]?.programs;
        
        if (programData) {
          programsWithProgress.add(programData.id);
          if (p.completed || (p.watched_seconds && p.watched_seconds > 0)) {
            activeProgramIds.add(programData.id);
          }
        }
      });

      // Buscar lección actual (última no completada con progreso)
      const currentLessonData = progressData?.find(p => 
        !p.completed && p.watched_seconds && p.watched_seconds > 0
      );

      let currentLesson = undefined;
      if (currentLessonData && currentLessonData.lesson) {
        const watchedMinutes = Math.floor((currentLessonData.watched_seconds || 0) / 60);
        const totalMinutes = currentLessonData.lesson.duration_minutes || 0;
        const progressPercent = totalMinutes > 0 ? Math.round((watchedMinutes / totalMinutes) * 100) : 0;
        
        const courseData = currentLessonData.lesson?.lesson_courses?.[0]?.courses;
        
        currentLesson = {
          id: currentLessonData.lesson.id,
          title: currentLessonData.lesson.title,
          course_title: courseData?.title || '',
          progress_percent: progressPercent,
          remaining_minutes: Math.max(0, totalMinutes - watchedMinutes)
        };
      }

      setStats({
        total_programs: programsWithProgress.size,
        active_programs: activeProgramIds.size,
        completed_lessons: completedLessons.length,
        total_study_time: totalStudyTime,
        certificates: 0, // Por ahora 0, se puede implementar después
        current_lesson: currentLesson
      });

    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchUserStats };
}