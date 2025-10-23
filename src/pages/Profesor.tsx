import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  XCircle,
  Users,
  FileText,
  BookOpen,
  Clock,
  Download,
  MessageSquare,
  Send,
  GraduationCap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { sendModuleCompletedEmail } from '@/lib/email';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Assignment {
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

interface ProgramStats {
  program_id: string;
  program_title: string;
  enrolled_count: number;
  courses_count: number;
}

interface CourseStats {
  course_id: string;
  course_title: string;
  program_title: string;
  enrolled_count: number;
  lessons_count: number;
}

export default function Profesor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAuthorized =
    profile?.role === 'formador' ||
    profile?.role === 'admin' ||
    profile?.role === 'profesor' ||
    profile?.role === 'teacher';

  // Query optimizada de assignments con joins (sin N+1)
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['profesor-assignments'],
    queryFn: async () => {
      // Un solo query con todos los joins necesarios
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          profiles!assignments_user_id_fkey(full_name),
          lessons!inner(
            title,
            courses!inner(title)
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((a: any) => ({
        ...a,
        user_profile: {
          full_name: a.profiles?.full_name || 'Usuario desconocido'
        },
        lesson: {
          title: a.lessons?.title || 'Lección',
          course: {
            title: a.lessons?.courses?.title || 'Curso'
          }
        }
      }));
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  // Query optimizada de program stats (sin N+1)
  const { data: programStats = [], isLoading: programsLoading } = useQuery({
    queryKey: ['profesor-program-stats'],
    queryFn: async () => {
      // Obtener todos los datos en paralelo
      const [{ data: programs }, { data: enrollments }, { data: programCourses }] = await Promise.all([
        supabase.from('programs').select('id, title'),
        supabase.from('enrollments').select('program_id').eq('status', 'active'),
        supabase.from('program_courses').select('program_id, course_id')
      ]);

      // Contar en memoria (más rápido que queries múltiples)
      const enrollmentCounts = new Map<string, number>();
      (enrollments || []).forEach(e => {
        enrollmentCounts.set(e.program_id, (enrollmentCounts.get(e.program_id) || 0) + 1);
      });

      const courseCounts = new Map<string, number>();
      (programCourses || []).forEach(pc => {
        courseCounts.set(pc.program_id, (courseCounts.get(pc.program_id) || 0) + 1);
      });

      return (programs || []).map(p => ({
        program_id: p.id,
        program_title: p.title,
        enrolled_count: enrollmentCounts.get(p.id) || 0,
        courses_count: courseCounts.get(p.id) || 0
      }));
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Query optimizada de course stats (sin N+1)
  const { data: courseStats = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['profesor-course-stats'],
    queryFn: async () => {
      // Obtener todos los datos en paralelo
      const [{ data: courses }, { data: enrollments }, { data: lessons }] = await Promise.all([
        supabase.from('courses').select('id, title, program_id, programs(title)'),
        supabase.from('course_enrollments').select('course_id').eq('status', 'active'),
        supabase.from('lessons').select('id, course_id')
      ]);

      // Contar en memoria
      const enrollmentCounts = new Map<string, number>();
      (enrollments || []).forEach(e => {
        enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) || 0) + 1);
      });

      const lessonCounts = new Map<string, number>();
      (lessons || []).forEach(l => {
        if (l.course_id) {
          lessonCounts.set(l.course_id, (lessonCounts.get(l.course_id) || 0) + 1);
        }
      });

      return (courses || []).map((c: any) => ({
        course_id: c.id,
        course_title: c.title,
        program_title: c.programs?.title || 'Sin programa',
        enrolled_count: enrollmentCounts.get(c.id) || 0,
        lessons_count: lessonCounts.get(c.id) || 0
      }));
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const loading = assignmentsLoading || programsLoading || coursesLoading;

  const handleApproveAssignment = async (assignmentId: string, action: 'approved' | 'rejected') => {
    if (!feedback.trim() && action === 'rejected') {
      toast({
        title: "Error",
        description: "El feedback es requerido para rechazar una entrega",
        variant: "destructive",
      });
      return;
    }

    const gradeValue = grade !== '' ? parseInt(grade) : null;
    if (action === 'approved' && gradeValue !== null && gradeValue < 0) {
      toast({
        title: "Error",
        description: "La calificación debe ser un número positivo",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) return;

      // Update assignment
      const { error: updateError } = await supabase
        .from('assignments')
        .update({
          status: action,
          grade: gradeValue,
          feedback: feedback.trim(),
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      // Si se aprobó, enviar email al alumno (trigger en DB se encarga del lesson_progress)
      if (action === 'approved') {
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', assignment.user_id)
          .single();
        if (studentProfile?.email) {
          try {
            await sendModuleCompletedEmail({
              to: studentProfile.email,
              modulo: assignment.lesson.title,
              proximo: undefined,
              ctaUrl: `${window.location.origin}/curso/${assignment.lesson_id}`,
            });
          } catch {}
        }
      }

      toast({
        title: "Éxito",
        description: `Entrega ${action === 'approved' ? 'aprobada' : 'rechazada'} y notificación enviada`,
      });

      // Reset form
      setSelectedAssignment(null);
      setFeedback('');
      setGrade('');

      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['profesor-assignments'] });

    } catch (error) {
      console.error('Error processing assignment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la entrega",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthorized) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mostrar todas las entregas y permitir aprobar en línea
  const pendingAssignments = assignments;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard del Profesor</h1>
        <p className="text-muted-foreground">Gestiona entregas y supervisa el progreso de los estudiantes</p>
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assignments">
            Entregas ({pendingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="stats">
            Estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">
          {pendingAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay entregas pendientes</h3>
                <p className="text-muted-foreground">Todas las entregas han sido revisadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Assignments List */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Entregas por Revisar</h2>
                {pendingAssignments.map(assignment => (
                  <Card 
                    key={assignment.id}
                    className={`transition-all hover:shadow-md`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{assignment.lesson?.title || 'Lección'}</CardTitle>
                          <p className="text-sm text-muted-foreground">{assignment.lesson?.course?.title || 'Curso'}</p>
                        </div>
                        <Badge variant="secondary">{assignment.status === 'approved' ? 'Aprobada' : assignment.status === 'rejected' ? 'Rechazada' : 'Pendiente'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{assignment.user_profile.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(assignment.created_at)}
                          </span>
                        </div>
                      </div>
                      {(assignment.file_url || assignment.text_answer) && (
                        <div className="flex items-center gap-2 mt-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {assignment.file_url ? 'Archivo adjunto' : 'Respuesta de texto'}
                          </span>
                          {assignment.file_url && (
                            <Button size="sm" variant="outline" onClick={() => window.open(assignment.file_url!, '_blank')}>
                              <Download className="h-3 w-3 mr-1" /> Abrir
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        {assignment.status !== 'approved' && (
                          <Button size="sm" className="flex-1" onClick={() => handleApproveAssignment(assignment.id, 'approved')} disabled={submitting}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Assignment Review Panel */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Revisar Entrega</h2>
                {selectedAssignment ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedAssignment.lesson.title}</CardTitle>
                      <p className="text-muted-foreground">
                        Estudiante: {selectedAssignment.user_profile.full_name}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* File Download */}
                      {selectedAssignment.file_url && (
                        <div>
                          <Label>Archivo Adjunto</Label>
                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => window.open(selectedAssignment.file_url!, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar Archivo
                          </Button>
                        </div>
                      )}

                      {/* Text Answer */}
                      {selectedAssignment.text_answer && (
                        <div>
                          <Label>Respuesta del Estudiante</Label>
                          <div className="p-3 border rounded-lg mt-2 bg-muted/50">
                            <p className="text-sm">{selectedAssignment.text_answer}</p>
                          </div>
                        </div>
                      )}

                      {/* Grade */}
                      <div>
                        <Label htmlFor="grade">Calificación (0-{selectedAssignment.max_grade})</Label>
                        <Input
                          id="grade"
                          type="number"
                          min="0"
                          max={selectedAssignment.max_grade}
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          placeholder="Ingresa la calificación"
                        />
                      </div>

                      {/* Feedback */}
                      <div>
                        <Label htmlFor="feedback">Comentarios</Label>
                        <Textarea
                          id="feedback"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Escribe tus comentarios sobre la entrega..."
                          className="mt-2"
                          rows={4}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => handleApproveAssignment(selectedAssignment.id, 'approved')}
                          disabled={submitting}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleApproveAssignment(selectedAssignment.id, 'rejected')}
                          disabled={submitting}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Selecciona una entrega</h3>
                      <p className="text-muted-foreground">
                        Haz clic en una entrega de la lista para revisarla
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Program Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Estadísticas de Programas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {programStats.map(program => (
                  <div key={program.program_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{program.program_title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {program.courses_count} curso(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {program.enrolled_count} estudiante(s)
                      </Badge>
                    </div>
                  </div>
                ))}
                {programStats.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No hay programas disponibles
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Estadísticas de Cursos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {courseStats.map(course => (
                  <div key={course.course_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{course.course_title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {course.program_title} • {course.lessons_count} lección(es)
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {course.enrolled_count} estudiante(s)
                      </Badge>
                    </div>
                  </div>
                ))}
                {courseStats.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No hay cursos disponibles
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}