import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, BookOpen, Clock, CheckCircle, Loader2, Calendar, Users, ExternalLink } from 'lucide-react';
import { usePrograms } from '@/hooks/usePrograms';
import { useUserStats } from '@/hooks/useUserStats';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatEventDate } from '@/lib/utils/date';

type CourseCard = {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  poster_2x3_url?: string | null;
  wide_11x6_url?: string | null;
};

interface Event {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  visibility: 'all' | 'students' | 'teachers';
  meeting_url?: string;
  created_by: string;
}

export default function Dashboard() {
  const { programs, loading: programsLoading } = usePrograms();
  const { stats, loading: statsLoading } = useUserStats();
  const { profile } = useAuth();

  // Query optimizada con React Query - eventos y cursos en paralelo
  const { data: dashboardData, isLoading: dataLoading } = useQuery({
    queryKey: ['dashboard-data', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { events: [], courses: [] };

      // Ejecutar todas las queries EN PARALELO
      const [
        enrollmentsResult,
        courseEnrollmentsResult,
        eventsResult
      ] = await Promise.all([
        // Inscripciones a programas
        supabase
          .from('enrollments')
          .select('program_id')
          .eq('user_id', profile.id)
          .eq('status', 'active'),

        // Inscripciones a cursos individuales
        supabase
          .from('course_enrollments')
          .select('courses (id, title, summary, slug, poster_2x3_url, wide_11x6_url)')
          .eq('user_id', profile.id)
          .eq('status', 'active'),

        // Eventos próximos (fallback sin columnas nuevas)
        supabase
          .from('events')
          .select('*')
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(5)
      ]);

      const programIds = (enrollmentsResult.data || []).map(p => p.program_id);

      // Obtener cursos de programas inscritos (solo si hay programas)
      let programCoursesResult = { data: [] as any[] };
      if (programIds.length > 0) {
        programCoursesResult = await supabase
          .from('program_courses')
          .select('course_id, courses (id, title, summary, slug, poster_2x3_url, wide_11x6_url)')
          .in('program_id', programIds);
      }

      // Crear Set de cursos incluidos en programas
      const bundledCourseIds = new Set(
        (programCoursesResult.data || [])
          .map((pc: any) => pc.course_id)
          .filter(Boolean)
      );

      // Cursos individuales (excluyendo los que ya están en programas)
      const individualCourses = (courseEnrollmentsResult.data || [])
        .map((row: any) => row.courses)
        .filter(Boolean)
        .filter((c: any) => !bundledCourseIds.has(c.id));

      return {
        events: eventsResult.data || [],
        courses: individualCourses
      };
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  const upcomingEvents = dashboardData?.events || [];
  const myCourses = dashboardData?.courses || [];

  if (programsLoading || statsLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          ¡Bienvenido, {profile?.full_name || profile?.email || 'Estudiante'}!
        </h1>
        <p className="text-muted-foreground">Continúa tu viaje en la geometría sagrada</p>
      </div>

      {/* Continuar aprendiendo */}
      {stats.current_lesson && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-accent" />
              Continuar Aprendiendo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-surface/50">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                <PlayCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{stats.current_lesson.course_title}</h3>
                <p className="text-sm text-muted-foreground">{stats.current_lesson.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {stats.current_lesson.remaining_minutes} min restantes
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-accent h-1.5 rounded-full" 
                    style={{ width: `${stats.current_lesson.progress_percent}%` }}
                  ></div>
                </div>
              </div>
              <Button asChild className="btn-modern">
                <Link to={`/lecciones/${stats.current_lesson.id}`}>
                  Continuar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos eventos */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map(event => {
              const match = event.description ? event.description.match(/https?:\/\/[^\s]+/i) : null;
              const fallbackUrl = match ? match[0] : null;
              const url = event.meeting_url || fallbackUrl;
              return (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatEventDate(event.start_at)}
                      </p>
                    </div>
                  </div>
                  {url && (
                    <Button size="sm" onClick={() => window.open(url, '_blank')} className="gap-1 btn-modern">
                      Abrir
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Mis programas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Mis Programas</h2>
          <Button variant="outline" asChild>
            <Link to="/mis-programas">Ver todos</Link>
          </Button>
        </div>
        
        {/* Mostrar programas inscritos para estudiantes */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.slice(0, 6).map((program) => {
            const averageProgress = program.courses?.reduce((acc, course) => 
              acc + (course.progress_percent || 0), 0
            ) / (program.courses?.length || 1) || 0;
            
            const hasProgress = averageProgress > 0;
            
            return (
              <Card key={program.id} className="cursor-pointer hover:elev-3 hover:-translate-y-1 transition-all duration-300 glow-hover">
                <Link to={`/programas/${program.slug}`}>
                  <div className="aspect-[2/3] bg-gradient-to-br from-accent/20 to-accent/10 rounded-t-lg flex items-center justify-center">
                    {program.poster_2x3_url ? (
                      <img 
                        src={program.poster_2x3_url} 
                        alt={program.title}
                        className="w-full h-full object-cover rounded-t-lg"
                        loading="lazy"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-accent" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {program.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {program.summary || 'Explora los misterios de la geometría sagrada'}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant={hasProgress ? "secondary" : "outline"}>
                        {hasProgress ? "En progreso" : "No iniciado"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(averageProgress)}% completo
                      </span>
                    </div>
                    {hasProgress && (
                      <div className="w-full bg-border rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-accent h-1.5 rounded-full" 
                          style={{ width: `${averageProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Mis cursos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Mis Cursos</h2>
          <Button variant="outline" asChild>
            <Link to="/cursos">Ver todos</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {myCourses.slice(0, 6).map(course => (
            <Card key={course.id} className="cursor-pointer hover:elev-3 hover:-translate-y-1 transition-all duration-300 glow-hover">
              <Link to={`/ver-curso/${course.slug}`}>
                <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                  {course.poster_2x3_url || course.wide_11x6_url ? (
                    <img 
                      src={course.poster_2x3_url || course.wide_11x6_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-accent" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.summary || 'Curso'}</p>
                  {/* Información interna removida para estudiantes */}
                </CardContent>
              </Link>
            </Card>
          ))}
          {myCourses.length === 0 && (
            <div className="text-sm text-muted-foreground">Aún no tienes cursos asignados.</div>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Programas</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.active_programs}</p>
            <p className="text-xs text-muted-foreground">En progreso</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Lecciones</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.completed_lessons}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Tiempo</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {Math.floor(stats.total_study_time / 60)}h {stats.total_study_time % 60}m
            </p>
            <p className="text-xs text-muted-foreground">Total estudiado</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Certificados</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.certificates}</p>
            <p className="text-xs text-muted-foreground">Obtenidos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}