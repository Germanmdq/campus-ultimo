import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

type CourseCard = {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  poster_2x3_url?: string | null;
  wide_11x6_url?: string | null;
  published_at?: string | null;
};

export default function MiFormacion() {
  const { profile } = useAuth();

  // Query optimizada con React Query y queries en paralelo
  const { data, isLoading } = useQuery({
    queryKey: ['my-formacion', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { programs: [], courses: [] };

      // Ejecutar queries en paralelo
      const [enrollmentsResult, courseEnrollmentsResult] = await Promise.all([
        // Programas con sus cursos
        supabase
          .from('enrollments')
          .select(`
            program_id,
            programs!inner (
              id, title, summary, slug, poster_2x3_url, wide_11x6_url, published_at
            )
          `)
          .eq('user_id', profile.id)
          .eq('status', 'active'),

        // Cursos individuales
        supabase
          .from('course_enrollments')
          .select(`
            course_id,
            courses!inner (
              id, title, summary, slug, poster_2x3_url, wide_11x6_url, published_at
            )
          `)
          .eq('user_id', profile.id)
          .eq('status', 'active')
      ]);

      // Extraer programas
      const programs = (enrollmentsResult.data || [])
        .map(e => e.programs)
        .filter(Boolean);

      // Obtener IDs de programas para buscar sus cursos
      const programIds = programs.map(p => p.id);

      // Cursos de programas (solo si hay programas)
      let programCourses: any[] = [];
      if (programIds.length > 0) {
        const { data: pc } = await supabase
          .from('program_courses')
          .select(`
            courses!inner (id, title, summary, slug, poster_2x3_url, wide_11x6_url, published_at)
          `)
          .in('program_id', programIds);

        programCourses = (pc || []).map(row => row.courses).filter(Boolean);
      }

      // Cursos individuales
      const individualCourses = (courseEnrollmentsResult.data || [])
        .map(e => e.courses)
        .filter(Boolean);

      // Combinar cursos evitando duplicados
      const courseIds = new Set(programCourses.map((c: any) => c.id));
      const uniqueIndividualCourses = individualCourses.filter(
        (c: any) => !courseIds.has(c.id)
      );

      return {
        programs,
        programCourses,
        individualCourses: uniqueIndividualCourses
      };
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  const { programs = [], programCourses = [], individualCourses = [] } = data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mi Formación</h1>
        <p className="text-muted-foreground mt-1">Tus programas y cursos en Geometría Sagrada</p>
      </div>

      {/* Programas */}
      {programs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Mis Programas</h2>
            <Badge variant="secondary">{programs.length}</Badge>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program: any) => (
              <Link key={`program-${program.id}`} to={`/programas/${program.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <div className="aspect-[2/3] bg-gradient-to-br from-primary/20 to-primary/10 relative overflow-hidden">
                    {program.poster_2x3_url ? (
                      <img
                        src={program.poster_2x3_url}
                        alt={program.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="h-16 w-16 text-primary opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary/90 backdrop-blur-sm">Programa</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {program.title}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cursos Individuales */}
      {individualCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Cursos Individuales</h2>
            <Badge variant="secondary">{individualCourses.length}</Badge>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {individualCourses.map((course) => (
              <Link key={`course-${course.id}`} to={`/ver-curso/${course.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <div className="aspect-[2/3] relative overflow-hidden">
                    {course.poster_2x3_url || course.wide_11x6_url ? (
                      <img
                        src={course.poster_2x3_url || course.wide_11x6_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-primary opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">Curso</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    {course.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.summary}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {programs.length === 0 && individualCourses.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Aún no estás inscrito en ningún programa o curso</h3>
          <p className="text-muted-foreground">
            Contacta a los administradores para que te inscriban en un programa.
          </p>
        </div>
      )}
    </div>
  );
}
