import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Program {
  id: string;
  title: string;
  summary: string;
  slug: string;
  poster_2x3_url: string;
  wide_11x6_url: string;
  published_at: string;
  courses?: Course[];
}

interface Course {
  id: string;
  title: string;
  summary: string;
  slug: string;
  sort_order: number;
  lessons_count?: number;
  progress_percent?: number;
}

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchPrograms();
  }, [user]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);

      // Para usuarios normales, solo programas publicados. Para admins/profesores, todos los programas
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id || '')
        .single();
      
      // Handle both old and new role values since database migration is pending
      const roleStr = profileData?.role?.toString() || '';
      const isTeacherOrAdmin = roleStr === 'teacher' || 
                              roleStr === 'formador' || 
                              roleStr === 'admin';
      
      // Si es teacher/admin: misma lógica de siempre (pueden ver todos los programas)
      if (isTeacherOrAdmin) {
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select(`
            id,
            title,
            summary,
            slug,
            poster_2x3_url,
            wide_11x6_url,
            published_at,
            program_courses (
              sort_order,
              courses (
                id,
                title,
                summary,
                slug,
                sort_order,
                published_at
              )
            )
          `)
          .order('sort_order');

        if (programsError) throw programsError;

        const mapped = (programsData || []).map((p: any) => ({
          ...p,
          courses: (p.program_courses || [])
            .map((pc: any) => pc.courses)
            .filter(Boolean)
        }));

        setPrograms(mapped);
        return;
      }

      // Estudiante: ver SOLO programas en los que está inscrito, aunque el programa no esté publicado.
      if (user) {
        // 1) Obtener IDs de programas inscritos
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('program_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (enrollmentsError) throw enrollmentsError;

        const enrolledProgramIds = enrollmentsData?.map(e => e.program_id) || [];

        if (enrolledProgramIds.length === 0) {
          setPrograms([]);
          return;
        }

        // 2) Traer datos de esos programas (sin filtrar por published_at)
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select(`
            id,
            title,
            summary,
            slug,
            poster_2x3_url,
            wide_11x6_url,
            published_at,
            program_courses (
              sort_order,
              courses (
                id,
                title,
                summary,
                slug,
                sort_order,
                published_at
              )
            )
          `)
          .in('id', enrolledProgramIds)
          .order('sort_order');

        if (programsError) throw programsError;

        // 3) Dentro de cada programa, incluir TODOS los cursos asignados (aunque no estén publicados)
        const mapped = (programsData || []).map((p: any) => ({
          ...p,
          courses: (p.program_courses || [])
            .map((pc: any) => pc.courses)
            .filter(Boolean)
        }));

        // 4) Calcular progreso por curso para el usuario
        const programsWithProgress = await Promise.all(
          mapped.map(async (program: any) => {
            if (program.courses?.length) {
              const coursesWithProgress = await Promise.all(
                program.courses.map(async (course: any) => {
                  // Contar lecciones del curso
                  const { count: lessonsCount } = await supabase
                    .from('lessons')
                    .select('*', { count: 'exact', head: true })
                    .eq('course_id', course.id);

                  // Obtener IDs de lecciones del curso
                  const { data: lessonIds } = await supabase
                    .from('lessons')
                    .select('id')
                    .eq('course_id', course.id);

                  const lessonIdsList = lessonIds?.map(l => l.id) || [];

                  // Contar lecciones completadas por el usuario
                  let completedCount = 0;
                  if (lessonIdsList.length > 0) {
                    const { count } = await supabase
                      .from('lesson_progress')
                      .select('*', { count: 'exact', head: true })
                      .eq('user_id', user.id)
                      .eq('completed', true)
                      .in('lesson_id', lessonIdsList);

                    completedCount = count || 0;
                  }

                  const progressPercent = lessonsCount && lessonsCount > 0
                    ? Math.round((completedCount / lessonsCount) * 100)
                    : 0;

                  return {
                    ...course,
                    lessons_count: lessonsCount || 0,
                    progress_percent: progressPercent
                  };
                })
              );

              return { ...program, courses: coursesWithProgress };
            }
            return program;
          })
        );

        setPrograms(programsWithProgress);
        return;
      }

      // Sin usuario logueado, comportamiento anterior (solo publicados)
      const { data: publicPrograms, error: programsError } = await supabase
        .from('programs')
        .select(`
          id,
          title,
          summary,
          slug,
          poster_2x3_url,
          wide_11x6_url,
          published_at
        `)
        .not('published_at', 'is', null)
        .order('sort_order');

      if (programsError) throw programsError;
      setPrograms(publicPrograms || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { programs, loading, error, refetch: fetchPrograms };
}