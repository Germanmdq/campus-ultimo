import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, FileText, Link, Users, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LessonMaterialsDialog } from '@/components/admin/LessonMaterialsDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  slug: string;
  video_url?: string;
  duration_minutes: number;
  has_assignment: boolean;
  has_materials: boolean;
  approval_form_url?: string | null;
  submission_url?: string | null;
  course_id: string;
  course?: {
    title: string;
    program?: {
      title: string;
    };
  };
}

interface Material {
  id: string;
  title: string;
  type: 'file' | 'link';
  file_url?: string;
  url?: string;
}

export default function LessonDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showMaterials, setShowMaterials] = useState(false);
  const [dropboxLink, setDropboxLink] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin';

  // Query optimizada de lesson con todos los datos
  const { data, isLoading, error } = useQuery({
    queryKey: ['lesson-detail', slug, profile?.id],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');

      // Queries en paralelo
      const [lessonResult, materialsResult, assignmentResult] = await Promise.all([
        // Lesson con course info
        supabase
          .from('lessons')
          .select(`
            *,
            lesson_courses(
              courses(
                title,
                programs(title)
              )
            )
          `)
          .eq('slug', slug)
          .maybeSingle(),

        // Materials
        supabase
          .from('lesson_materials')
          .select('*')
          .eq('slug', slug) // Usamos slug primero para evitar query extra
          .order('sort_order'),

        // Assignment si el usuario está logueado
        profile?.id
          ? supabase
              .from('assignments')
              .select('id, status, file_url, text_answer')
              .eq('user_id', profile.id)
              .eq('lesson_id', slug) // Temporal, lo arreglaremos después
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ]);

      if (lessonResult.error) throw lessonResult.error;
      if (!lessonResult.data) throw new Error('Lección no encontrada');

      const lessonData = lessonResult.data;

      // Buscar materiales usando lesson_id ahora que lo tenemos
      const { data: correctMaterials } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonData.id)
        .order('sort_order');

      // Buscar assignment correcto
      let assignmentData = assignmentResult.data;
      if (profile?.id && lessonData.id) {
        const { data: correctAssignment } = await supabase
          .from('assignments')
          .select('id, status, file_url, text_answer')
          .eq('user_id', profile.id)
          .eq('lesson_id', lessonData.id)
          .limit(1)
          .maybeSingle();
        assignmentData = correctAssignment;
      }

      const courseInfo = lessonData.lesson_courses?.[0]?.courses;
      const lesson = {
        ...lessonData,
        course: courseInfo
          ? {
              title: courseInfo.title,
              program: courseInfo.programs
            }
          : null
      };

      const materials = (correctMaterials || []).map(m => ({
        id: m.id,
        title: m.title,
        type: m.material_type as 'file' | 'link',
        file_url: m.file_url,
        url: m.url
      }));

      return {
        lesson,
        materials,
        assignment: assignmentData
      };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
  });

  const lesson = data?.lesson || null;
  const materials = data?.materials || [];
  const assignment = data?.assignment;

  const normalizeDropboxLink = (url: string) => {
    try {
      const u = new URL(url);
      // Aceptar dominios de Dropbox
      if (!/dropbox\.com$|dropboxusercontent\.com$/.test(u.hostname)) return url;
      // Forzar descarga directa cuando corresponde
      if (u.hostname.endsWith('dropbox.com')) {
        if (u.searchParams.has('dl')) {
          u.searchParams.set('dl', '1');
        } else {
          u.search += (u.search ? '&' : '?') + 'dl=1';
        }
        return u.toString();
      }
      return url;
    } catch {
      return url;
    }
  };

  const handleSubmitAssignment = async () => {
    if (!lesson || !profile) return;
    const link = dropboxLink.trim();
    if (!link) {
      toast({ title: 'Falta el enlace', description: 'Pegá el enlace de Dropbox del archivo.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const fileUrl = normalizeDropboxLink(link);
      const payload = {
        user_id: profile.id,
        lesson_id: lesson.id,
        text_answer: textAnswer.trim() || null,
        file_url: fileUrl,
        status: 'submitted' as const,
      };

      // upsert para permitir re-envío (manteniendo una fila por user/lesson)
      const { error } = await supabase
        .from('assignments')
        .upsert(payload, { onConflict: 'user_id,lesson_id' });
      if (error) throw error;

      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['lesson-detail', slug, profile.id] });

      toast({ title: 'Enviado', description: 'Tu trabajo fue enviado para revisión.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo enviar el trabajo.' , variant: 'destructive'});
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    navigate('/lecciones');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Lección no encontrada</p>
        <Button onClick={() => {
          console.log('Botón Volver a Lecciones clickeado');
          navigate('/lecciones');
        }} className="mt-4">
          Volver a Lecciones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/lecciones')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Lecciones
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{lesson.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">{lesson.course?.title}</span>
              {lesson.course?.program && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{lesson.course.program.title}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {isTeacherOrAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setShowMaterials(true)} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Materiales ({materials.length})
            </Button>
          </div>
        )}
      </div>

      {/* Lesson Content - Vista de alumno mejorada */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Video */}
        {lesson.video_url && (
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video">
                <iframe
                  src={lesson.video_url}
                  title={lesson.title}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información de la lección */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Información de la lección
              </CardTitle>
              {isTeacherOrAdmin && (
                <Button onClick={() => setShowMaterials(true)} variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Gestionar Materiales
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Duración: {lesson.duration_minutes} minutos</span>
            </div>
            {materials.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{materials.length} material(es) disponibles</span>
              </div>
            )}
            {lesson.has_assignment && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">Tiene trabajo práctico entregable</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description card */}
        {lesson.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{lesson.description}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Materials section - SOLO SI HAY MATERIALES */}
        {materials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Materiales de la lección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {materials.map(material => (
                <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {material.type === 'file' ? <FileText className="h-5 w-5 text-primary" /> : <Link className="h-5 w-5 text-primary" />}
                    <div>
                      <h4 className="font-medium">{material.title}</h4>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {material.type === 'file' ? 'Archivo' : 'Enlace'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const url = material.type === 'file' ? material.file_url : material.url;
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    {material.type === 'file' ? 'Descargar' : 'Abrir'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Assignment section - SOLO SI TIENE ENTREGABLE Y ES ESTUDIANTE */}
        {lesson.has_assignment && !isTeacherOrAdmin && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Trabajo Práctico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="text-4xl text-green-600">✓</div>
                  </div>
                  <p className="text-lg font-semibold text-green-600">Trabajo enviado</p>
                  <p className="text-sm text-muted-foreground mt-2">Tu trabajo ha sido enviado para revisión</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Esta lección requiere la entrega de un trabajo práctico.
                  </p>

                  {/* Formulario externo (si existe) */}
                  {lesson.approval_form_url && lesson.approval_form_url !== 't' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(lesson.approval_form_url, '_blank', 'noopener,noreferrer')}
                    >
                      Abrir Formulario de Envío
                    </Button>
                  )}

                  {/* Envío directo */}
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <label htmlFor="work-url" className="text-sm font-medium">
                        Enlace a tu trabajo (Dropbox, Drive, etc.)
                      </label>
                      <Input
                        id="work-url"
                        type="url"
                        placeholder="https://www.dropbox.com/..."
                        value={dropboxLink}
                        onChange={(e) => setDropboxLink(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="work-comments" className="text-sm font-medium">
                        Comentarios (opcional)
                      </label>
                      <Textarea
                        id="work-comments"
                        placeholder="Agrega cualquier comentario sobre tu trabajo..."
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleSubmitAssignment}
                      disabled={submitting || !dropboxLink.trim()}
                    >
                      {submitting ? 'Enviando...' : 'Enviar Trabajo'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Materials Dialog */}
      {lesson && (
        <LessonMaterialsDialog
          open={showMaterials}
          onOpenChange={(open) => {
            setShowMaterials(open);
            if (!open) {
              // Refrescar materiales cuando se cierre el diálogo
              queryClient.invalidateQueries({ queryKey: ['lesson-detail', slug, profile?.id] });
            }
          }}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
        />
      )}
    </div>
  );
}