import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface EditLessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lessonId: string;
}

interface Course {
  id: string;
  title: string;
  program?: { title: string };
}

interface Lesson {
  id: string;
  title: string;
  sort_order: number;
}

export function EditLessonForm({ open, onOpenChange, onSuccess, lessonId }: EditLessonFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [hasAssignment, setHasAssignment] = useState(false);
  const [assignmentInstructions, setAssignmentInstructions] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [prerequisiteId, setPrerequisiteId] = useState('none');
  const [hasMaterials, setHasMaterials] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [prerequisites, setPrerequisites] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && lessonId) {
      fetchLessonData();
      fetchCourses();
    }
  }, [open, lessonId]);

  useEffect(() => {
    if (selectedCourses.length > 0) {
      fetchPrerequisites();
    }
  }, [selectedCourses]);

  const fetchLessonData = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la lección",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setTitle(data.title || '');
      setDescription(data.description || '');
      setSlug(data.slug || '');
      setVideoUrl(data.video_url || '');
      setDuration(data.duration_minutes?.toString() || '');
      setHasAssignment(data.has_assignment || false);
      setAssignmentInstructions(data.assignment_instructions || '');
      setRequiresApproval(data.requires_admin_approval || false);
      setPrerequisiteId(data.prerequisite_lesson_id || 'none');
      setHasMaterials(data.has_materials || false);
      
      // Fetch current lesson courses
      fetchLessonCourses();
    }
  };

  const fetchLessonCourses = async () => {
    const { data, error } = await supabase
      .from('lesson_courses')
      .select('course_id')
      .eq('lesson_id', lessonId);
    
    if (error) {
      setSelectedCourses([]);
      return;
    }

    const ids = (data || []).map(lc => lc.course_id).filter(Boolean);
    if (ids.length > 0) {
      setSelectedCourses(ids);
      return;
    }

    // Fallback: para lecciones antiguas que aún tienen lessons.course_id
    const { data: legacy, error: legacyErr } = await supabase
      .from('lessons')
      .select('course_id')
      .eq('id', lessonId)
      .maybeSingle();
    if (!legacyErr && legacy?.course_id) {
      setSelectedCourses([legacy.course_id]);
    } else {
      setSelectedCourses([]);
    }
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id, 
        title,
        program_courses (
          programs (title)
        )
      `)
      .order('title');
    
    if (error) {
      setCourses([]);
      return;
    }
    // Normalizar a { program: { title } }
    const normalized = (data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      program: c.program_courses?.[0]?.programs ? { title: c.program_courses[0].programs.title } : undefined,
    }));
    setCourses(normalized);
  };

  const fetchPrerequisites = async () => {
    if (selectedCourses.length === 0) return;
    
    const { data } = await supabase
      .from('lessons')
      .select(`
        id, 
        title, 
        sort_order,
        lesson_courses!inner (course_id)
      `)
      .in('lesson_courses.course_id', selectedCourses)
      .neq('id', lessonId)
      .order('sort_order');
    
    setPrerequisites(data || []);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !slug.trim()) {
      toast({
        title: "Error",
        description: "Título y slug son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (selectedCourses.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un curso (no se eliminarán relaciones existentes)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update lesson data
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          slug: slug.trim(),
          video_url: videoUrl.trim() || null,
          duration_minutes: duration ? parseInt(duration) : 0,
          has_assignment: hasAssignment,
          assignment_instructions: hasAssignment ? assignmentInstructions.trim() || null : null,
          requires_admin_approval: requiresApproval,
          prerequisite_lesson_id: (prerequisiteId && prerequisiteId !== 'none') ? prerequisiteId : null,
          has_materials: hasMaterials,
        })
        .eq('id', lessonId);

      if (lessonError) throw lessonError;

      // Update lesson courses: reemplazar relaciones solo si hay selección válida
      const { error: deleteError } = await supabase
        .from('lesson_courses')
        .delete()
        .eq('lesson_id', lessonId);
      if (deleteError) throw deleteError;

      if (selectedCourses.length > 0) {
        const lessonCoursesData = selectedCourses.map(courseId => ({
          lesson_id: lessonId,
          course_id: courseId
        }));

        const { error: insertError } = await supabase
          .from('lesson_courses')
          .insert(lessonCoursesData);

        if (insertError) throw insertError;
      }

      toast({
        title: "Lección actualizada",
        description: `La lección "${title}" ha sido actualizada exitosamente`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la lección",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lección</DialogTitle>
          <DialogDescription>Edita los campos y previsualiza la descripción en Markdown.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Cursos (selecciona uno o varios)</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {courses.map(course => (
                <div key={course.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`course-${course.id}`}
                    checked={selectedCourses.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCourses([...selectedCourses, course.id]);
                      } else {
                        setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                      }
                    }}
                    disabled={loading}
                    className="rounded"
                  />
                  <Label htmlFor={`course-${course.id}`} className="text-sm">
                    {course.title}
                    {course.program && <span className="text-muted-foreground"> - {course.program.title}</span>}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="title">Título de la Lección</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Los Números Sagrados"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="los-numeros-sagrados"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción (Markdown)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Puedes usar negritas, listas, títulos, enlaces, etc."
              rows={6}
              disabled={loading}
            />
            <div className="mt-3 p-3 border rounded-md">
              <p className="text-xs text-muted-foreground mb-2">Vista previa</p>
              <div className="prose dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>{description || '*Sin contenido*'}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="videoUrl">URL del Video</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://vimeo.com/..."
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                disabled={loading}
              />
            </div>
          </div>

          {prerequisites.length > 0 && (
            <div>
              <Label htmlFor="prerequisite">Lección Prerequisito</Label>
              <Select value={prerequisiteId} onValueChange={setPrerequisiteId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin prerequisito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin prerequisito</SelectItem>
                  {prerequisites.map(lesson => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="hasAssignment" 
              checked={hasAssignment} 
              onCheckedChange={(checked) => setHasAssignment(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="hasAssignment">Tiene tarea/entregable</Label>
          </div>

          {hasAssignment && (
            <div>
              <Label htmlFor="assignmentInstructions">Instrucciones de la Tarea</Label>
              <Textarea
                id="assignmentInstructions"
                value={assignmentInstructions}
                onChange={(e) => setAssignmentInstructions(e.target.value)}
                placeholder="Instrucciones para el estudiante..."
                rows={3}
                disabled={loading}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="requiresApproval" 
              checked={requiresApproval} 
              onCheckedChange={(checked) => setRequiresApproval(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="requiresApproval">Requiere aprobación del administrador</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="hasMaterials" 
              checked={hasMaterials} 
              onCheckedChange={(checked) => setHasMaterials(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="hasMaterials">Tiene materiales (PDFs, enlaces, etc.)</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Lección'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}