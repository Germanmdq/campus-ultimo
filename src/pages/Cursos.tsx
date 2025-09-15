import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Plus, Users, BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreateCourseForm } from '@/components/admin/CreateCourseForm';

interface Course {
  id: string;
  title: string;
  summary: string;
  slug: string;
  sort_order: number;
  poster_2x3_url?: string;
  wide_11x6_url?: string;
  published_at?: string;
  programs?: { title: string };
}

interface GroupedCourse {
  programTitle: string;
  courses: Course[];
}

export default function Cursos() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<GroupedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const role = (profile?.role || '').toString();
  const isTeacherOrAdmin = ['formador','teacher','profesor','admin'].includes(role);

  useEffect(() => {
    fetchCourses();
  }, [profile?.role]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      if (isTeacherOrAdmin) {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            summary,
            slug,
            sort_order,
            poster_2x3_url,
            wide_11x6_url,
            published_at,
            program_courses (
              program_id,
              programs (title)
            )
          `)
          .order('sort_order');

        if (error) throw error;

        // Agrupar por programa; si no tiene, va a "Sin programa"
        const byProgram: Record<string, Course[]> = {};
        (data || []).forEach((course: any) => {
          const programTitle = course.program_courses?.[0]?.programs?.title || 'Sin programa';
          if (!byProgram[programTitle]) byProgram[programTitle] = [];
          byProgram[programTitle].push(course as Course);
        });

        const grouped: GroupedCourse[] = Object.entries(byProgram)
          .map(([programTitle, list]) => ({ programTitle, courses: list }))
          .sort((a, b) => a.programTitle.localeCompare(b.programTitle));

        setCourses(grouped);
        return;
      }

      // Estudiante: mostrar cursos de sus programas + cursos individuales inscritos (publicados)
      if (!user) {
        setCourses([]);
        return;
      }

      // 1) Traer enrollments de cursos individuales
      const { data: courseEnrollments, error: ceError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (ceError) throw ceError;

      const enrolledCourseIds = (courseEnrollments || []).map(e => e.course_id);
      // No cortar aquí: también puede ver cursos de programas inscritos

      // 2) Traer esos cursos, solo si publicados, y que sean individuales (sin program_courses)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          summary,
          slug,
          sort_order,
          poster_2x3_url,
          wide_11x6_url,
          published_at,
          program_courses (program_id)
        `)
        .in('id', enrolledCourseIds.length > 0 ? enrolledCourseIds : ["00000000-0000-0000-0000-000000000000"]) // evita error si vacío
        .not('published_at', 'is', null)
        .order('sort_order');

      if (coursesError) throw coursesError;

      const individualPublished = (coursesData || []).filter(course => 
        !course.program_courses || course.program_courses.length === 0
      );

      // 3) Traer cursos que pertenecen a los programas del alumno
      const { data: myPrograms } = await supabase
        .from('enrollments')
        .select('program_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const myProgramIds = (myPrograms || []).map(p => p.program_id);
      let programCourses: any[] = [];
      if (myProgramIds.length > 0) {
        const { data: pc } = await supabase
          .from('program_courses')
          .select('program_id, courses (id, title, summary, slug, poster_2x3_url, wide_11x6_url, published_at)')
          .in('program_id', myProgramIds)
          .order('program_id');
        programCourses = pc || [];
      }

      const grouped: GroupedCourse[] = [];
      if (programCourses.length > 0) {
        const byProgram: Record<string, Course[]> = {};
        for (const row of programCourses) {
          const c = row.courses;
          if (!c) continue;
          if (!byProgram[row.program_id]) byProgram[row.program_id] = [];
          byProgram[row.program_id].push(c);
        }
        for (const programId of Object.keys(byProgram)) {
          grouped.push({ programTitle: 'Cursos del Programa', courses: byProgram[programId] });
        }
      }

      if (individualPublished.length > 0) {
        grouped.push({ programTitle: 'Mis cursos individuales', courses: individualPublished });
      }

      setCourses(grouped);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los cursos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourse = (slug: string) => {
    navigate(`/curso/${slug}`);
  };

  const handleCreateCourse = () => {
    setShowCreateForm(true);
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el curso "${courseTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: "Curso eliminado",
        description: `El curso "${courseTitle}" ha sido eliminado exitosamente`,
      });

      fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el curso",
        variant: "destructive",
      });
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cursos</h1>
          <p className="text-muted-foreground">
            {isTeacherOrAdmin ? 'Gestiona los cursos de los programas' : 'Explora los cursos disponibles'}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Button className="gap-2" onClick={handleCreateCourse}>
            <Plus className="h-4 w-4" />
            Nuevo Curso
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {courses.map((group) => (
          <Card key={group.programTitle}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                {group.programTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.courses.map((course) => {
                  const isPublished = !!course.published_at;
                  
                  return (
                    <Card key={course.id}>
                      <div className="aspect-[11/6] relative overflow-hidden rounded-t-lg">
                        {course.poster_2x3_url || course.wide_11x6_url ? (
                          <img 
                            src={course.poster_2x3_url || course.wide_11x6_url} 
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-r ${isPublished ? 'from-accent/20 to-accent/10' : 'from-muted/20 to-muted/10'} flex items-center justify-center`}>
                            <GraduationCap className={`h-8 w-8 ${isPublished ? 'text-accent' : 'text-muted'}`} />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-foreground mb-2 line-clamp-2">{course.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {course.summary || 'Curso de geometría sagrada'}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant={isPublished ? "default" : "secondary"}>
                            {isPublished ? "Publicado" : "Borrador"}
                          </Badge>
                          {isTeacherOrAdmin && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>0 estudiantes</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isTeacherOrAdmin ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => navigate(`/curso/${course.id}/edit`)}
                              >
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteCourse(course.id, course.title)}
                              >
                                Eliminar
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleViewCourse(course.slug)}
                              >
                                Ver
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              className="w-full" 
                              onClick={() => handleViewCourse(course.slug)}
                              disabled={!isPublished}
                            >
                              {isPublished ? "Empezar" : "No Disponible"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Crear nuevo curso - Solo para teachers/admin */}
        {isTeacherOrAdmin && (
          <Card className="border-dashed">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Crear Curso</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Agrega un nuevo curso a un programa existente
              </p>
              <Button onClick={handleCreateCourse}>Crear Curso</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateCourseForm 
        open={showCreateForm} 
        onOpenChange={setShowCreateForm}
        onSuccess={fetchCourses}
      />
    </div>
  );
}