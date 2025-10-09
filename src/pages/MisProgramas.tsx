import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, PlayCircle, Calendar, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface EnrolledProgram {
  id: string;
  title: string;
  summary: string;
  slug: string;
  poster_2x3_url: string;
  wide_11x6_url: string;
  enrollment_status: string;
  enrolled_at: string;
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

interface EnrolledCourse {
  id: string;
  title: string;
  summary: string;
  slug: string;
  poster_2x3_url: string;
  wide_11x6_url: string;
  enrollment_status: string;
  enrolled_at: string;
  lessons_count?: number;
  progress_percent?: number;
  type: 'individual';
}

export default function MisProgramas() {
  const { user } = useAuth();
  const [enrolledPrograms, setEnrolledPrograms] = useState<EnrolledProgram[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEnrolledData();
    }
  }, [user]);

  const fetchEnrolledData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('status, created_at, programs(id, title, summary, slug, poster_2x3_url, wide_11x6_url)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const programsWithProgress = await Promise.all(
        (enrollmentsData || []).map(async (enrollment: any) => {
          const program = enrollment.programs;
          if (!program) return null;

          // UNA query para cursos Y progreso
          const { data: coursesData } = await supabase
            .from('program_courses')
            .select(`
              courses!inner(id, title, summary, slug),
              sort_order
            `)
            .eq('program_id', program.id)
            .order('sort_order');

          if (!coursesData?.length) return null;

          // UNA query para TODO el progreso de este usuario en estos cursos
          const courseIds = coursesData.map(pc => pc.courses.id);
          
          const [lessonsResult, progressResult] = await Promise.all([
            supabase.from('lessons').select('id, course_id').in('course_id', courseIds),
            supabase.from('lesson_progress').select('lesson_id, completed')
              .eq('user_id', user.id).eq('completed', true)
          ]);

          const lessonsByCourse = (lessonsResult.data || []).reduce((acc, l) => {
            acc[l.course_id] = (acc[l.course_id] || 0) + 1;
            return acc;
          }, {});

          const completedLessons = new Set((progressResult.data || []).map(p => p.lesson_id));

          const courses = coursesData.map(pc => {
            const course = pc.courses;
            const totalLessons = lessonsByCourse[course.id] || 0;
            const completed = (lessonsResult.data || [])
              .filter(l => l.course_id === course.id && completedLessons.has(l.id))
              .length;
            
            return {
              ...course,
              lessons_count: totalLessons,
              progress_percent: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0
            };
          });

          return {
            ...program,
            enrollment_status: enrollment.status,
            enrolled_at: enrollment.created_at,
            courses
          };
        })
      );

      setEnrolledPrograms(programsWithProgress.filter(Boolean));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mis Programas</h1>
        <p className="text-muted-foreground">
          Programas en los que estás inscrito y tu progreso
        </p>
      </div>

      {enrolledPrograms.length === 0 && enrolledCourses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No tienes programas asignados</h3>
            <p className="text-muted-foreground mb-4">
              Contacta con tu instructor para que te asigne programas de estudio
            </p>
            <Button asChild>
              <Link to="/programas">Explorar Programas</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Programas */}
          {enrolledPrograms.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Programas</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {enrolledPrograms.map((program) => {
            const averageProgress = program.courses?.reduce((acc, course) => 
              acc + (course.progress_percent || 0), 0
            ) / (program.courses?.length || 1) || 0;
            
            const hasProgress = averageProgress > 0;
            const coursesCount = program.courses?.length || 0;
            
            return (
              <Card key={program.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
                <Link to={`/programas/${program.slug}`}>
                  <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                    {program.poster_2x3_url || program.wide_11x6_url ? (
                      <img 
                        src={program.poster_2x3_url || program.wide_11x6_url} 
                        alt={program.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-accent" />
                      </div>
                    )}
                    {hasProgress && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-accent text-white">
                          {Math.round(averageProgress)}% completo
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {program.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {program.summary || 'Descubre los secretos de la geometría sagrada'}
                    </p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span>{coursesCount} cursos</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Desde {formatDate(program.enrolled_at)}</span>
                      </div>
                    </div>

                    {/* Lista de cursos con progreso */}
                    {program.courses && program.courses.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">Progreso por curso:</p>
                        <div className="space-y-1">
                          {program.courses.slice(0, 3).map((course) => (
                            <div key={course.id} className="text-xs text-foreground flex items-center justify-between">
                              <span className="truncate">{course.title}</span>
                              <div className="flex items-center gap-1 text-muted-foreground ml-2">
                                <span>{course.progress_percent || 0}%</span>
                                <div className="w-8 bg-border rounded-full h-1">
                                  <div 
                                    className="bg-accent h-1 rounded-full" 
                                    style={{ width: `${course.progress_percent || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {program.courses.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{program.courses.length - 3} cursos más
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <Button size="sm" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-1" />
                      {hasProgress ? "Continuar" : "Comenzar"}
                    </Button>
                    
                    {hasProgress && (
                      <div className="w-full bg-border rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-accent h-1.5 rounded-full transition-all duration-300" 
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
          )}

          {/* Cursos Individuales */}
          {enrolledCourses.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Cursos Individuales</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enrolledCourses.map((course) => (
                  <Card key={course.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
                    <Link to={`/ver-curso/${course.slug}`}>
                      <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                        {course.poster_2x3_url || course.wide_11x6_url ? (
                          <img 
                            src={course.poster_2x3_url || course.wide_11x6_url} 
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-primary" />
                          </div>
                        )}
                        {course.progress_percent && course.progress_percent > 0 && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-primary text-white">
                              {course.progress_percent}% completo
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                          {course.summary || 'Curso individual'}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <BookOpen className="h-3 w-3" />
                            <span>{course.lessons_count || 0} lecciones</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Desde {formatDate(course.enrolled_at)}</span>
                          </div>
                        </div>

                        <Button size="sm" className="w-full">
                          <PlayCircle className="h-4 w-4 mr-1" />
                          {course.progress_percent && course.progress_percent > 0 ? "Continuar" : "Comenzar"}
                        </Button>
                        
                        {course.progress_percent && course.progress_percent > 0 && (
                          <div className="w-full bg-border rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${course.progress_percent}%` }}
                            ></div>
                          </div>
                        )}
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estadísticas */}
      {(enrolledPrograms.length > 0 || enrolledCourses.length > 0) && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Programas</span>
              </div>
              <p className="text-2xl font-bold mt-2">{enrolledPrograms.length}</p>
              <p className="text-xs text-muted-foreground">Inscritos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Cursos</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {enrolledPrograms.reduce((acc, p) => acc + (p.courses?.length || 0), 0) + enrolledCourses.length}
              </p>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Progreso</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {Math.round(enrolledPrograms.reduce((acc, p) => {
                  const avgProgress = p.courses?.reduce((courseAcc, course) => 
                    courseAcc + (course.progress_percent || 0), 0
                  ) / (p.courses?.length || 1) || 0;
                  return acc + avgProgress;
                }, 0) / (enrolledPrograms.length || 1))}%
              </p>
              <p className="text-xs text-muted-foreground">Promedio</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Activos</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {enrolledPrograms.filter(p => p.enrollment_status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground">En progreso</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}