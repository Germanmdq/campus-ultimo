import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Link as LinkIcon } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ArrowLeft, PlayCircle, CheckCircle, Clock, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sendModuleCompletedEmail, sendCourseCompletedEmail, sendPostCourseRecommendationEmail } from '@/lib/email';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  video_url?: string;
  duration_minutes?: number;
  sort_order: number;
  completed?: boolean;
  unlocked?: boolean;
  has_assignment?: boolean;
  requires_admin_approval?: boolean;
  approval_form_url?: string | null;
}

interface Course {
  id: string;
  title: string;
  summary?: string;
  lessons?: Lesson[];
}

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [materials, setMaterials] = useState<Array<{ id: string; title: string; type: 'file' | 'link'; file_url?: string | null; url?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const canSubmitActions = !!profile && (profile.role === 'student' || profile.role === 'admin' || profile.role === 'formador');
  // Popup de descripción removido; descripción se muestra inline
  const [formOpen, setFormOpen] = useState(false);
  const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeQ4xFNiHQmqbBv0tJ3T6qfEPyjTc4zVNYyS_TEPHQqBzKChA/viewform';

  const toEmbeddedFormUrl = (url: string) => {
    try {
      const u = new URL(url, window.location.origin);
      if (u.host.includes('docs.google.com') && u.pathname.includes('/forms/')) {
        if (!u.searchParams.has('embedded')) u.searchParams.set('embedded', 'true');
        return u.toString();
      }
      return url;
    } catch {
      return url;
    }
  };

  // Detectar si viene de un programa
  const searchParams = new URLSearchParams(window.location.search);
  const fromProgram = searchParams.get('from') === 'programa';
  const programSlug = searchParams.get('programa');

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, profile?.id]);

  const fetchCourse = async () => {
    try {
      // Fetch course details by slug (courseId is actually the slug in the URL)
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, summary')
        .eq('slug', courseId)
        .single();

      if (courseError) throw courseError;

      // Fetch lessons for this course using lesson_courses (many-to-many)
      const { data: lessonCoursesData, error: lessonsError } = await supabase
        .from('lesson_courses')
        .select(`
          lessons (*)
        `)
        .eq('course_id', courseData.id);

      if (lessonsError) throw lessonsError;

      // Extract and sort lessons
      const lessonsData = (lessonCoursesData || [])
        .map(lc => lc.lessons)
        .filter(Boolean)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Fetch user progress if logged in
      let progressData = [];
      if (profile?.id) {
        const { data } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', profile.id);
        
        progressData = data || [];
      }

      // Combine lessons with progress
  const lessonsWithProgress = (lessonsData || []).map((lesson, index) => {
        const progress = progressData.find(p => p.lesson_id === lesson.id);
        const completed = progress?.completed || false;
        
        // First lesson is always unlocked
        let unlocked = index === 0;
        
        // Check if previous lesson is completed OR if user has required assignment approved
        if (index > 0) {
          const prevLesson = lessonsData[index - 1];
          const prevProgress = progressData.find(p => p.lesson_id === prevLesson.id);
          
          // If previous lesson is completed
          if (prevProgress?.completed) {
            // If previous lesson has assignment, check if it's approved
            if (prevLesson.has_assignment) {
              // For now, assume approved if completed (we'll add assignment checking later)
              unlocked = true;
            } else {
              unlocked = true;
            }
          }
        }

        return {
          ...lesson,
          completed,
          unlocked
        };
      });

      setCourse({
        ...courseData,
        lessons: lessonsWithProgress
      });

      // Load materials for the first/current lesson
      const firstLesson = lessonsWithProgress[0];
      if (firstLesson) {
        const { data: materialsData } = await supabase
          .from('lesson_materials')
          .select('*')
          .eq('lesson_id', firstLesson.id)
          .order('sort_order');
        setMaterials(materialsData || []);
      } else {
        setMaterials([]);
      }

    } catch (error: any) {
      console.error('Error fetching course:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el curso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLessonSelect = (index: number) => {
    const lesson = course?.lessons?.[index];
    if (lesson?.unlocked) {
      setCurrentLesson(index);
      // Load materials for selected lesson
      (async () => {
        const { data: materialsData } = await supabase
          .from('lesson_materials')
          .select('*')
          .eq('lesson_id', lesson.id)
          .order('sort_order');
        setMaterials(materialsData || []);
      })();
    }
  };

  const handleMarkComplete = async () => {
    const lesson = course?.lessons?.[currentLesson];
    if (!lesson || !profile?.id) return;

    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: profile.id,
          lesson_id: lesson.id,
          completed: true
        }, { 
          onConflict: 'user_id,lesson_id' 
        });

      if (error) throw error;

      toast({
        title: "Lección completada",
        description: `${lesson.title} marcada como completada`,
      });

      // Disparar email: módulo completado
      if (profile?.email) {
        try {
          await sendModuleCompletedEmail({
            to: profile.email,
            modulo: lesson.title,
            proximo: course?.lessons?.[currentLesson + 1]?.title,
            ctaUrl: course ? `${window.location.origin}/ver-curso/${courseId}` : undefined,
          });
        } catch {}
      }

      // Calcular si con esta acción se completa el curso
      if (course && profile?.email) {
        const total = course.lessons?.length || 0;
        const alreadyCompleted = course.lessons?.filter(l => l.completed).length || 0;
        const willBeCompleted = alreadyCompleted + (lesson.completed ? 0 : 1);
        if (total > 0 && willBeCompleted >= total) {
          try {
            await sendCourseCompletedEmail({
              to: profile.email,
              nombre: profile.full_name,
              curso: course.title,
              ctaUrl: `${window.location.origin}/mi-formacion`,
            });
            await sendPostCourseRecommendationEmail({
              to: profile.email,
              curso: course.title,
              siguiente_programa: 'Programa avanzado',
              ctaUrl: `${window.location.origin}/programas`,
            });
          } catch {}
        }
      }

      // Refresh course data to update progress
      fetchCourse();

    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo marcar la lección como completada",
        variant: "destructive",
      });
    }
  };

  const handleNotifyAndOpenDropbox = async () => {
    const lesson = course?.lessons?.[currentLesson];
    // Abrir Dropbox primero para evitar bloqueos del navegador
    const dropboxUrl = 'https://www.dropbox.com/request/LlaRtF8KefIoXHjdg0Uo';
    window.open(dropboxUrl, '_blank', 'noopener,noreferrer');
    // Registrar la entrega en segundo plano si hay sesión y lección
    if (!lesson || !profile?.id) return;
    try {
      const nowIso = new Date().toISOString();
      // Intentar insertar primero
      const { error: insertError } = await supabase
        .from('assignments')
        .insert({
          user_id: profile.id,
          lesson_id: lesson.id,
          status: 'submitted',
          text_answer: 'Entrega enviada por Dropbox',
          updated_at: nowIso,
        });
      if (insertError) {
        // Si ya existía, actualizar estado a submitted
        const { error: updateError } = await supabase
          .from('assignments')
          .update({
            status: 'submitted',
            text_answer: 'Entrega enviada por Dropbox',
            updated_at: nowIso,
          })
          .eq('user_id', profile.id)
          .eq('lesson_id', lesson.id);
        if (updateError) throw updateError;
      }
      toast({ title: 'Aviso enviado', description: 'Se registró tu entrega.' });
    } catch (e: any) {
      console.error('Error registrando entrega:', e);
      toast({ title: 'No se pudo registrar la entrega', description: e?.message || 'Permisos/RLS o conexión.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course || !course.lessons || course.lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No hay lecciones disponibles</h2>
        <p className="text-muted-foreground mb-4">Este curso aún no tiene lecciones publicadas.</p>
        <Button onClick={() => {
          if (fromProgram && programSlug) {
            navigate(`/programas/${programSlug}`);
          } else {
            navigate('/mis-programas');
          }
        }}>
          {fromProgram ? 'Volver al Programa' : 'Volver a Mis Programas'}
        </Button>
      </div>
    );
  }

  const currentLessonData = course.lessons[currentLesson];
  const completedLessons = course.lessons.filter(l => l.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mi-formacion')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Mi Formación
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          <p className="text-muted-foreground">{course.summary}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Reproductor de Video */}
        <div className="lg:col-span-2 space-y-4">
          {currentLessonData.video_url ? (
            <VideoPlayer 
              videoUrl={currentLessonData.video_url}
              title={currentLessonData.title}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin video disponible</h3>
                <p className="text-muted-foreground">Esta lección no tiene video asignado</p>
              </CardContent>
            </Card>
          )}
          
          {/* Información de la lección actual */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{currentLessonData.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {currentLessonData.duration_minutes && currentLessonData.duration_minutes > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {currentLessonData.duration_minutes} min
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Descripción de la lección (inline) */}
              {currentLessonData.description && (
                <div className="mb-4 prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{currentLessonData.description}</ReactMarkdown>
                </div>
              )}

              {/* 2) Materiales (solo si existen) */}
              {materials.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Materiales</span>
                  </div>
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {m.type === 'file' ? <FileText className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                        <div>
                          <h4 className="font-medium">{m.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {m.type === 'file' ? 'Archivo' : 'Enlace'}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => {
                        const url = m.type === 'file' ? m.file_url : m.url;
                        if (url) window.open(url, '_blank');
                      }}>
                        {m.type === 'file' ? 'Descargar' : 'Abrir'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 3) Formulario + Trabajo práctico */}
              {canSubmitActions && (
                currentLessonData.has_assignment ||
                currentLessonData.requires_admin_approval ||
                !!currentLessonData.approval_form_url
              ) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {(currentLessonData.requires_admin_approval || currentLessonData.approval_form_url) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = currentLessonData.approval_form_url || GOOGLE_FORM_URL;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Completar formulario
                    </Button>
                  )}
                  <Button onClick={handleNotifyAndOpenDropbox}>
                    Enviar trabajo práctico
                  </Button>
                </div>
              )}

              {/* Botón de completar si corresponde */}
              {profile?.id && !currentLessonData.completed && !currentLessonData.requires_admin_approval && (
                <Button onClick={handleMarkComplete} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Marcar como Completada
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Lecciones */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lecciones del Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {course.lessons.map((lesson, index) => (
                 <div
                   key={lesson.id}
                   className={`
                     p-3 rounded-lg border transition-colors
                     ${!lesson.unlocked 
                       ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                       : index === currentLesson 
                         ? 'bg-accent/10 border-accent cursor-pointer' 
                         : 'hover:bg-muted/50 cursor-pointer'
                     }
                   `}
                   onClick={() => handleLessonSelect(index)}
                 >
                  <div className="flex items-start gap-3">
                     <div className={`
                       h-8 w-8 rounded-lg flex items-center justify-center
                       ${!lesson.unlocked
                         ? 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                         : lesson.completed 
                           ? 'bg-green-100 text-green-600 dark:bg-green-900/20' 
                           : 'bg-accent/20 text-accent'
                       }
                     `}>
                       {!lesson.unlocked ? (
                         <span className="text-xs">🔒</span>
                       ) : lesson.completed ? (
                         <CheckCircle className="h-4 w-4" />
                       ) : (
                         <PlayCircle className="h-4 w-4" />
                       )}
                     </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight">{lesson.title}</h4>
                      {/* Descripción oculta en la lista para evitar scroll excesivo */}
                      <div className="flex items-center gap-2 mt-2">
                        {lesson.duration_minutes && lesson.duration_minutes > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {lesson.duration_minutes} min
                          </Badge>
                        )}
                        {lesson.completed && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Completada
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Progreso del Curso */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Progreso del Curso</p>
                 <div className="w-full bg-muted rounded-full h-2 mb-2">
                   <div className="bg-accent h-2 rounded-full" style={{ width: `${(completedLessons / course.lessons.length) * 100}%` }}></div>
                 </div>
                 <p className="text-xs text-muted-foreground">{completedLessons} de {course.lessons.length} lecciones completadas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Popup del formulario */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Formulario de entrega</DialogTitle>
          </DialogHeader>
          <div className="w-full h-full bg-white rounded-md overflow-hidden">
            <iframe 
              src={toEmbeddedFormUrl(currentLessonData.approval_form_url || GOOGLE_FORM_URL)} 
              className="w-full h-full"
              style={{ border: '0' }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}