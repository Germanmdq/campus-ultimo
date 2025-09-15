import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Plus, FileText, CheckCircle, Clock, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreateLessonForm } from '@/components/admin/CreateLessonForm';
import { EditLessonForm } from '@/components/admin/EditLessonForm';
import { LessonMaterialsDialog } from '@/components/admin/LessonMaterialsDialog';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  slug: string;
  duration_minutes?: number;
  has_assignment: boolean;
  requires_admin_approval: boolean;
  courses?: { 
    title: string;
    programs?: { title: string };
  };
}

interface GroupedLesson {
  courseId: string;
  courseTitle: string;
  programTitle: string;
  lessons: Lesson[];
}

export default function Lecciones() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<GroupedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const isTeacherOrAdmin = ['teacher','profesor','admin','formador'].includes(profile?.role || '');

  useEffect(() => {
    if (isTeacherOrAdmin) {
      fetchLessons();
    }
  }, [isTeacherOrAdmin]);

  const fetchLessons = async () => {
    if (!isTeacherOrAdmin) return;
    setLoading(true);
    try {
      // Traer lecciones con su curso y programa asociado por FK directa
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          description,
          slug,
          duration_minutes,
          has_assignment,
          requires_admin_approval,
          courses:course_id (
            id,
            title,
            program:programs ( title )
          )
        `)
        .order('sort_order');
      if (error) throw error;

      const grouped: GroupedLesson[] = [];
      for (const l of (lessonsData || []) as any[]) {
        const courseId = l.courses?.id || 'sin-curso';
        const courseTitle = l.courses?.title || 'Sin curso asignado';
        const programTitle = l.courses?.program?.title || 'Sin programa';
        const lesson: Lesson = {
          id: l.id,
          title: l.title,
          description: l.description,
          slug: l.slug,
          duration_minutes: l.duration_minutes,
          has_assignment: l.has_assignment,
          requires_admin_approval: l.requires_admin_approval,
          courses: { title: courseTitle, programs: { title: programTitle } }
        };
        let group = grouped.find(g => g.courseId === courseId);
        if (!group) {
          group = { courseId, courseTitle, programTitle, lessons: [] };
          grouped.push(group);
        }
        group.lessons.push(lesson);
      }
      setLessons(grouped);

      // Calcular aprobaciones PENDIENTES reales (assignments en estado submitted/reviewing)
      const lessonIds = (lessonsData || []).map((l: any) => l.id);
      if (lessonIds.length > 0) {
        const { count } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .in('lesson_id', lessonIds)
          .in('status', ['submitted', 'reviewing']);
        setPendingApprovals(count || 0);
      } else {
        setPendingApprovals(0);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las lecciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewLesson = (slug: string, title: string) => {
    toast({
      title: `Abriendo lección: ${title}`,
      description: "El reproductor de video se abrirá próximamente",
    });
  };

  // Eliminado: botón para abrir popup de creación (formulario irá inline)

  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowEditForm(true);
  };

  const handleShowMaterials = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowMaterials(true);
  };

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la lección "${lessonTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: "Lección eliminada",
        description: `La lección "${lessonTitle}" ha sido eliminada exitosamente`,
      });

      fetchLessons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la lección",
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

  if (!isTeacherOrAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Lecciones</h1>
        <p className="text-muted-foreground">Esta sección es solo para docentes y administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lecciones</h1>
          <p className="text-muted-foreground">
            {isTeacherOrAdmin ? 'Gestiona el contenido de las lecciones' : 'Explora las lecciones disponibles'}
          </p>
        </div>
        {/* Se quitó el botón que abría el popup; ahora el formulario está inline abajo */}
      </div>

      <div className="space-y-6">
        {lessons.map((group) => (
          <Card key={group.courseId}>
            <CardHeader className="cursor-pointer" onClick={() => setExpanded(prev => ({ ...prev, [group.courseId]: !prev[group.courseId] }))}>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <div>
                    <div>{group.courseTitle}</div>
                    <div className="text-sm text-muted-foreground font-normal">{group.programTitle}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{group.lessons.length} lección(es)</div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expanded[group.courseId] && (
                <div className="space-y-4">
                  {group.lessons.map((lesson) => (
                    <Card key={lesson.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                            {lesson.has_assignment ? (
                              <FileText className="h-6 w-6 text-accent" />
                            ) : (
                              <PlayCircle className="h-6 w-6 text-accent" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">{lesson.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {lesson.description || 'Lección de geometría sagrada'}
                            </p>
                            <div className="flex items-center gap-4 mb-3">
                              <Badge>Publicado</Badge>
                              {lesson.requires_admin_approval && (
                                <Badge variant="secondary">Requiere Aprobación</Badge>
                              )}
                              {lesson.has_assignment && (
                                <Badge variant="outline">Con Tarea</Badge>
                              )}
                              {lesson.duration_minutes && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{lesson.duration_minutes} min</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {isTeacherOrAdmin ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleEditLesson(lesson)}
                                  >
                                    Editar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleShowMaterials(lesson)}
                                  >
                                    Materiales
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                  >
                                    Eliminar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleViewLesson(lesson.slug, lesson.title)}
                                  >
                                    Ver
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleViewLesson(lesson.slug, lesson.title)}
                                >
                                  Ver Lección
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Crear nueva lección - Inline para docentes/admin */}
        {isTeacherOrAdmin && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Crear Lección</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CreateLessonForm inline onSuccess={fetchLessons} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {lessons.reduce((acc, group) => acc + group.lessons.length, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Lecciones</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Con Tareas</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {lessons.reduce((acc, group) => 
                acc + group.lessons.filter(l => l.has_assignment).length, 0
              )}
            </p>
            <p className="text-xs text-muted-foreground">Lecciones</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Pendientes de aprobación</span>
            </div>
            <p className="text-2xl font-bold mt-2">{pendingApprovals}</p>
            <p className="text-xs text-muted-foreground">Entregas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Cursos</span>
            </div>
            <p className="text-2xl font-bold mt-2">{lessons.length}</p>
            <p className="text-xs text-muted-foreground">Con lecciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Se eliminó el render del popup de creación. */}

      {selectedLesson && (
        <>
          <EditLessonForm
            open={showEditForm}
            onOpenChange={setShowEditForm}
            onSuccess={fetchLessons}
            lessonId={selectedLesson.id}
          />
          <LessonMaterialsDialog
            open={showMaterials}
            onOpenChange={setShowMaterials}
            lessonId={selectedLesson.id}
            lessonTitle={selectedLesson.title}
          />
        </>
      )}
    </div>
  );
}