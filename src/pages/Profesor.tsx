import { useState, useEffect } from 'react';
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [programStats, setProgramStats] = useState<ProgramStats[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (
      profile?.role === 'formador' ||
      profile?.role === 'admin' ||
      profile?.role === 'profesor' ||
      profile?.role === 'teacher'
    ) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          lesson:lessons(
            title,
            course:courses(title)
          )
        `)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (assignmentsError) throw assignmentsError;
      
      // Get user profiles for assignments
      const assignmentsWithProfiles = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const [{ data: profileData }, lessonInfo] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name')
              .eq('id', assignment.user_id)
              .single(),
            assignment.lesson ? Promise.resolve({ data: assignment.lesson }) : supabase
              .from('lessons')
              .select('title, course:courses(title)')
              .eq('id', assignment.lesson_id)
              .single()
          ]);

          return {
            ...assignment,
            lesson: lessonInfo?.data || assignment.lesson,
            user_profile: {
              full_name: profileData?.full_name || 'Usuario desconocido'
            }
          };
        })
      );
      
      setAssignments(assignmentsWithProfiles);

      // Fetch program stats with proper enrollment counting
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select(`
          id,
          title,
          courses(id)
        `);

      if (programsError) throw programsError;
      
      // Get enrollment counts for each program
      const programStatsPromises = programsData?.map(async (program) => {
        const { count: enrolledCount } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id)
          .eq('status', 'active');
        
        return {
          program_id: program.id,
          program_title: program.title,
          enrolled_count: enrolledCount || 0,
          courses_count: program.courses?.length || 0
        };
      }) || [];
      
      const programStatsData = await Promise.all(programStatsPromises);
      setProgramStats(programStatsData);

      // Fetch course stats with proper enrollment counting  
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          program_id,
          program:programs(title),
          lessons(id)
        `);

      if (coursesError) throw coursesError;
      
      const courseStatsPromises = coursesData?.map(async (course) => {
        // Para cursos individuales, contar inscripciones directas en course_enrollments
        const { count: enrolledCount } = await supabase
          .from('course_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('status', 'active');
        
        return {
          course_id: course.id,
          course_title: course.title,
          program_title: course.program?.title || 'Sin programa',
          enrolled_count: enrolledCount || 0,
          lessons_count: course.lessons?.length || 0
        };
      }) || [];
      
      const courseStatsData = await Promise.all(courseStatsPromises);
      setCourseStats(courseStatsData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      
      // Refresh data
      fetchData();

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

  if (
    profile?.role !== 'formador' &&
    profile?.role !== 'admin' &&
    profile?.role !== 'profesor' &&
    profile?.role !== 'teacher'
  ) {
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