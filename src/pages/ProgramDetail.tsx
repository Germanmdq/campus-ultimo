import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, BookOpen, Plus, Edit2, Save, X, Loader2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { AddCoursesToProgramDialog } from '@/components/admin/AddCoursesToProgramDialog';
import { EnrollUsersDialog } from '@/components/admin/EnrollUsersDialog';

interface Program {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  poster_2x3_url?: string;
  wide_11x6_url?: string;
  published_at?: string;
}

interface Course {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  sort_order: number;
  published_at?: string;
}

export default function ProgramDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [program, setProgram] = useState<Program | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddCourses, setShowAddCourses] = useState(false);
  const [showEnrollUsers, setShowEnrollUsers] = useState(false);
  
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    poster_2x3_url: '',
    wide_11x6_url: ''
  });

  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin';

  useEffect(() => {
    if (slug) {
      fetchProgramDetails();
    }
  }, [slug]);

  const fetchProgramDetails = async () => {
    setLoading(true);
    try {
      // Fetch program
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (programError) throw programError;
      setProgram(programData);
      setEditForm({
        title: programData.title,
        summary: programData.summary || '',
        poster_2x3_url: programData.poster_2x3_url || '',
        wide_11x6_url: programData.wide_11x6_url || ''
      });

      // Fetch courses in this program
      const { data: coursesData, error: coursesError } = await supabase
        .from('program_courses')
        .select(`
          courses (
            id,
            title,
            summary,
            slug,
            sort_order,
            published_at
          )
        `)
        .eq('program_id', programData.id)
        .order('sort_order');

      if (coursesError) throw coursesError;
      setCourses(coursesData?.map(pc => pc.courses).filter(Boolean) || []);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar el programa",
        variant: "destructive",
      });
      navigate('/programas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!program) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('programs')
        .update({
          title: editForm.title,
          summary: editForm.summary || null,
          poster_2x3_url: editForm.poster_2x3_url || null,
          wide_11x6_url: editForm.wide_11x6_url || null
        })
        .eq('id', program.id);

      if (error) throw error;

      toast({
        title: "Programa actualizado",
        description: "Los cambios han sido guardados exitosamente",
      });

      setProgram({
        ...program,
        title: editForm.title,
        summary: editForm.summary,
        poster_2x3_url: editForm.poster_2x3_url,
        wide_11x6_url: editForm.wide_11x6_url
      });
      setEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el programa",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!program) return;
    
    const newPublishedAt = program.published_at ? null : new Date().toISOString();
    
    try {
      const { error } = await supabase
        .from('programs')
        .update({ published_at: newPublishedAt })
        .eq('id', program.id);

      if (error) throw error;

      setProgram({ ...program, published_at: newPublishedAt });
      toast({
        title: newPublishedAt ? "Programa publicado" : "Programa despublicado",
        description: newPublishedAt ? "El programa ya está visible para los estudiantes" : "El programa ya no es visible para los estudiantes",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del programa",
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

  if (!program) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Programa no encontrado</p>
        <Button onClick={() => navigate('/programas')} className="mt-4">
          Volver a Programas
        </Button>
      </div>
    );
  }

  const isPublished = !!program.published_at;
  const normalize = (v: string) =>
    v
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .trim();
  const looksLikeSlug = (summary?: string | null, slug?: string | null) => {
    if (!summary) return false;
    const s = summary.trim();
    const ns = normalize(s).replace(/\s+/g, '-');
    const nslug = slug ? normalize(slug) : '';
    if (nslug && (ns === nslug || ns === nslug.replace(/\//g, '-'))) return true;
    // si no tiene espacios y contiene guiones o barras, probablemente es slug
    if (!s.includes(' ') && (s.includes('-') || s.includes('/'))) return true;
    // muchas palabras separadas por guiones
    if ((s.match(/-/g) || []).length >= 2 && s.split(' ').length <= 2) return true;
    return false;
  };
  const displaySummary = program.summary && !looksLikeSlug(program.summary, program.slug) ? program.summary : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mi-formacion')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Mi Formación
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{program.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {isTeacherOrAdmin && (
                <Badge variant={isPublished ? "default" : "secondary"}>
                  {isPublished ? "Publicado" : "Borrador"}
                </Badge>
              )}
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{courses.length} cursos</span>
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
        {/* Program Details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Programa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
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
                  <div className="aspect-[2/3] relative overflow-hidden rounded-lg">
                    {program.poster_2x3_url || program.wide_11x6_url ? (
                      <img
                        src={program.poster_2x3_url || program.wide_11x6_url}
                        alt={program.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-accent" />
                      </div>
                    )}
                  </div>
                  {displaySummary && (
                    <div>
                      <h3 className="font-semibold mb-2">Resumen</h3>
                      <p className="text-muted-foreground">
                        {displaySummary}
                      </p>
                    </div>
                  )}
                  {/* Ocultamos URL para no ensuciar la UI */}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Courses */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Cursos ({courses.length})
              </CardTitle>
              {isTeacherOrAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowAddCourses(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Cursos
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowEnrollUsers(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Inscribir Usuarios
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Sin cursos</h3>
                  <p className="text-muted-foreground mb-4">
                    Este programa aún no tiene cursos asignados
                  </p>
                  {isTeacherOrAdmin && (
                    <Button onClick={() => navigate('/cursos')}>
                      Crear Primer Curso
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course, index) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/10 cursor-pointer group"
                      onClick={() => navigate(`/ver-curso/${course.slug}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground font-mono w-8">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <h4 className="font-medium group-hover:text-accent transition-colors">{course.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isTeacherOrAdmin && (
                          <>
                            <Badge variant={course.published_at ? "default" : "secondary"}>
                              {course.published_at ? "Publicado" : "Borrador"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/curso/${course.id}/edit`);
                              }}
                            >
                              Editar
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ver-curso/${course.slug}?from=programa&programa=${program?.slug}`);
                          }}
                          className="btn-modern"
                        >
                          Empezar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {program && (
        <>
          <AddCoursesToProgramDialog
            open={showAddCourses}
            onOpenChange={setShowAddCourses}
            programId={program.id}
            onSuccess={fetchProgramDetails}
          />
          <EnrollUsersDialog
            open={showEnrollUsers}
            onOpenChange={setShowEnrollUsers}
            programId={program.id}
            programTitle={program.title}
            onSuccess={() => {}}
          />
        </>
      )}
    </div>
  );
}