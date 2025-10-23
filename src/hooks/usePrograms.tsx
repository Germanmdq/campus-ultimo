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

        // 4) Calcular progreso por curso EN MEMORIA (sin N+1)
        // Obtener todos los IDs de cursos
        const allCourseIds = mapped.flatMap((p: any) =>
          (p.courses || []).map((c: any) => c.id)
        );

        if (allCourseIds.length === 0) {
          setPrograms(mapped);
          return;
        }

        // Query paralelas para obtener toda la data de una vez
        const [lessonsResult, progressResult] = await Promise.all([
          // Todas las lecciones de todos los cursos
          supabase
            .from('lessons')
            .select('id, course_id')
            .in('course_id', allCourseIds),

          // Todo el progreso del usuario
          supabase
            .from('lesson_progress')
            .select('lesson_id, completed')
            .eq('user_id', user.id)
            .eq('completed', true)
        ]);

        // Procesar en memoria: contar lecciones por curso
        const lessonCountByCourse = new Map<string, number>();
        const lessonIdsByCourse = new Map<string, Set<string>>();

        (lessonsResult.data || []).forEach(lesson => {
          lessonCountByCourse.set(
            lesson.course_id,
            (lessonCountByCourse.get(lesson.course_id) || 0) + 1
          );

          if (!lessonIdsByCourse.has(lesson.course_id)) {
            lessonIdsByCourse.set(lesson.course_id, new Set());
          }
          lessonIdsByCourse.get(lesson.course_id)!.add(lesson.id);
        });

        // Procesar en memoria: lecciones completadas
        const completedLessonIds = new Set(
          (progressResult.data || []).map(p => p.lesson_id)
        );

        // Contar completadas por curso
        const completedCountByCourse = new Map<string, number>();
        lessonIdsByCourse.forEach((lessonIds, courseId) => {
          let count = 0;
          lessonIds.forEach(lessonId => {
            if (completedLessonIds.has(lessonId)) count++;
          });
          completedCountByCourse.set(courseId, count);
        });

        // Aplicar progreso a los cursos
        const programsWithProgress = mapped.map((program: any) => {
          if (program.courses?.length) {
            const coursesWithProgress = program.courses.map((course: any) => {
              const lessonsCount = lessonCountByCourse.get(course.id) || 0;
              const completedCount = completedCountByCourse.get(course.id) || 0;
              const progressPercent = lessonsCount > 0
                ? Math.round((completedCount / lessonsCount) * 100)
                : 0;

              return {
                ...course,
                lessons_count: lessonsCount,
                progress_percent: progressPercent
              };
            });

            return { ...program, courses: coursesWithProgress };
          }
          return program;
        });

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