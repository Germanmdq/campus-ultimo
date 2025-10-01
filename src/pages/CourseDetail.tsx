import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, GraduationCap, Edit2, Save, X, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface Course {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  poster_2x3_url?: string;
  wide_11x6_url?: string;
  published_at?: string;
  sort_order: number;
  program_id?: string;
}

interface Program {
  id: string;
  title: string;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    slug: '',
    poster_2x3_url: '',
    wide_11x6_url: '',
    program_id: ''
  });

  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin';

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      fetchPrograms();
    }
  }, [courseId]);

  const fetchPrograms = async () => {
    const { data } = await supabase
      .from('programs')
      .select('id, title')
      .order('title');
    
    setPrograms(data || []);
  };

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      // Si viene con /edit al final, es edición
      const isEdit = window.location.pathname.includes('/edit');
      if (isEdit) {
        setEditing(true);
      }

      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`
          *,
          program_courses (program_id)
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;
      
      const courseWithProgram = {
        ...courseData,
        program_id: courseData.program_courses?.[0]?.program_id || ''
      };
      
      setCourse(courseWithProgram);
      setEditForm({
        title: courseWithProgram.title,
        summary: courseWithProgram.summary || '',
        slug: courseWithProgram.slug,
        poster_2x3_url: courseWithProgram.poster_2x3_url || '',
        wide_11x6_url: courseWithProgram.wide_11x6_url || '',
        program_id: courseWithProgram.program_id
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar el curso",
        variant: "destructive",
      });
      navigate('/cursos');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSave = async () => {
    if (!course) return;
    
    setSaving(true);
    try {
      // Update course
      const { error: courseError } = await supabase
        .from('courses')
        .update({
          title: editForm.title,
          summary: editForm.summary || null,
          slug: editForm.slug,
          poster_2x3_url: editForm.poster_2x3_url || null,
          wide_11x6_url: editForm.wide_11x6_url || null
        })
        .eq('id', course.id);

      if (courseError) throw courseError;

      // Update program association if changed
      if (editForm.program_id !== course.program_id) {
        // Remove old association
        if (course.program_id) {
          await supabase
            .from('program_courses')
            .delete()
            .eq('course_id', course.id)
            .eq('program_id', course.program_id);
        }
        
        // Add new association
        if (editForm.program_id && editForm.program_id !== 'no-program') {
          const { error: associationError } = await supabase
            .from('program_courses')
            .insert({
              program_id: editForm.program_id,
              course_id: course.id,
              sort_order: 0
            });
          
          if (associationError) throw associationError;
        }
      }

      toast({
        title: "Curso actualizado",
        description: "Los cambios han sido guardados exitosamente",
      });

      setCourse({
        ...course,
        title: editForm.title,
        summary: editForm.summary,
        slug: editForm.slug,
        poster_2x3_url: editForm.poster_2x3_url,
        wide_11x6_url: editForm.wide_11x6_url,
        program_id: editForm.program_id === 'no-program' ? null : editForm.program_id
      });
      setEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el curso",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;
    
    const newPublishedAt = course.published_at ? null : new Date().toISOString();
    
    try {
      const { error } = await supabase
        .from('courses')
        .update({ published_at: newPublishedAt })
        .eq('id', course.id);

      if (error) throw error;

      setCourse({ ...course, published_at: newPublishedAt });
      toast({
        title: newPublishedAt ? "Curso publicado" : "Curso despublicado",
        description: newPublishedAt ? "El curso ya está visible para los estudiantes" : "El curso ya no es visible para los estudiantes",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del curso",
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

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Curso no encontrado</p>
        <Button onClick={() => {
          console.log('Botón Volver a Cursos clickeado');
          navigate('/cursos');
        }} className="mt-4">
          Volver a Cursos
        </Button>
      </div>
    );
  }

  const isPublished = !!course.published_at;
  const assignedProgram = programs.find(p => p.id === course.program_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cursos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cursos
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isPublished ? "default" : "secondary"}>
                {isPublished ? "Publicado" : "Borrador"}
              </Badge>
              {assignedProgram && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{assignedProgram.title}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {isTeacherOrAdmin && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  variant={isPublished ? "destructive" : "default"}
                  onClick={handlePublishToggle}
                >
                  {isPublished ? "Despublicar" : "Publicar"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Course Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setEditForm({ 
                          ...editForm, 
                          title: newTitle, 
                          slug: generateSlug(newTitle) 
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input
                      value={editForm.slug}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Programa</Label>
                    <Select value={editForm.program_id} onValueChange={(value) => setEditForm({ ...editForm, program_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar programa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-program">Sin programa</SelectItem>
                        {programs.map(program => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Resumen</Label>
                    <Textarea
                      value={editForm.summary}
                      onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <ImageUpload
                    label="Imagen Poster (2x3)"
                    value={editForm.poster_2x3_url}
                    onChange={(value) => setEditForm({ ...editForm, poster_2x3_url: value })}
                    aspectRatio="2/3"
                  />
                  <ImageUpload
                    label="Imagen Wide (11x6)"
                    value={editForm.wide_11x6_url}
                    onChange={(value) => setEditForm({ ...editForm, wide_11x6_url: value })}
                    aspectRatio="11/6"
                  />
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">Información General</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Programa:</span>
                        <span>{assignedProgram?.title || 'Sin asignar'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">URL:</span>
                        <span className="font-mono text-sm">/curso/{course.slug}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estado:</span>
                        <Badge variant={isPublished ? "default" : "secondary"}>
                          {isPublished ? "Publicado" : "Borrador"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Resumen</h3>
                    <p className="text-muted-foreground">
                      {course.summary || 'Sin descripción disponible'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Course Image */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Imagen del Curso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[11/6] relative overflow-hidden rounded-lg">
                {course.poster_2x3_url || course.wide_11x6_url ? (
                  <img
                    src={course.poster_2x3_url || course.wide_11x6_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-accent" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          {isTeacherOrAdmin && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => navigate('/lecciones')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Ver Lecciones
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => navigate('/usuarios')}
                >
                  Ver Estudiantes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}