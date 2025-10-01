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
import { LessonMaterialsDialog } from './LessonMaterialsDialog';
import ReactMarkdown from 'react-markdown';

interface CreateLessonFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  inline?: boolean;
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

export function CreateLessonForm({ open, onOpenChange, onSuccess, inline }: CreateLessonFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [courseId, setCourseId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [hasAssignment, setHasAssignment] = useState(false);
  const [assignmentInstructions, setAssignmentInstructions] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approvalFormUrl, setApprovalFormUrl] = useState('');
  const [prerequisiteId, setPrerequisiteId] = useState('none');
  const [hasMaterials, setHasMaterials] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [prerequisites, setPrerequisites] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMaterialsDialog, setShowMaterialsDialog] = useState(false);
  const [createdLessonId, setCreatedLessonId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (inline) {
      fetchCourses();
    } else if (open) {
      fetchCourses();
    }
  }, [open, inline]);

  useEffect(() => {
    if (courseId) {
      fetchPrerequisites();
    }
  }, [courseId]);

  const fetchCourses = async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select(`
          id, 
          title,
          program:programs (title)
        `)
        .order('title');
      
      setCourses(data || []);
    } catch (error) {
      console.warn('Error fetching courses (RLS issue):', error);
      setCourses([]);
    }
  };

  const fetchPrerequisites = async () => {
    if (!courseId) {
      setPrerequisites([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, sort_order')
        .eq('course_id', courseId)
        .order('sort_order');
      if (error) throw error;
      setPrerequisites(data || []);
    } catch (e) {
      setPrerequisites([]);
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

  const ensureUniqueLessonSlug = async (base: string, courseId: string) => {
    const baseSlug = base || 'leccion';
    const { data } = await supabase
      .from('lessons')
      .select('slug')
      .eq('course_id', courseId)
      .ilike('slug', `${baseSlug}%`);
    const taken = new Set((data || []).map((r: any) => r.slug));
    if (!taken.has(baseSlug)) return baseSlug;
    let i = 2;
    while (taken.has(`${baseSlug}-${i}`)) i++;
    return `${baseSlug}-${i}`;
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !courseId) {
      toast({
        title: "Error",
        description: "Título y curso son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const base = generateSlug(title.trim());
      const uniqueSlug = await ensureUniqueLessonSlug(base, courseId);
      // 1. Crear la lección CON course_id (requerido por la tabla)
      const { data, error } = await supabase
        .from('lessons')
        .insert([{
          title: title.trim(),
          description: description.trim() || null,
          slug: uniqueSlug,
          video_url: videoUrl.trim() || null,
          duration_minutes: duration ? parseInt(duration) : 0,
          has_assignment: hasAssignment,
          assignment_instructions: hasAssignment ? assignmentInstructions.trim() || null : null,
          requires_admin_approval: requiresApproval,
          approval_form_url: requiresApproval ? (approvalFormUrl.trim() || null) : null,
          prerequisite_lesson_id: (prerequisiteId && prerequisiteId !== 'none') ? prerequisiteId : null,
          has_materials: hasMaterials,
          sort_order: prerequisites.length + 1,
          course_id: courseId // ✅ AGREGAR course_id requerido
        }])
        .select('id')
        .single();

      if (error) throw error;

      // 2. Crear la relación en lesson_courses (many-to-many)
      const { error: relationError } = await supabase
        .from('lesson_courses')
        .insert([{
          lesson_id: data.id,
          course_id: courseId
        }]);

      if (relationError) throw relationError;

      toast({
        title: "Lección creada",
        description: `La lección "${title}" ha sido creada exitosamente`,
      });

      // Si tiene materiales, abrir el diálogo para cargarlos
      if (hasMaterials && data) {
        setCreatedLessonId(data.id);
        setShowMaterialsDialog(true);
      } else {
        // Reset form si no tiene materiales
        resetForm();
        if (!inline) {
          onOpenChange && onOpenChange(false);
        }
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la lección",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSlug('');
    setCourseId('');
    setVideoUrl('');
    setDuration('');
    setHasAssignment(false);
    setAssignmentInstructions('');
    setRequiresApproval(false);
    setApprovalFormUrl('');
    setPrerequisiteId('');
    setHasMaterials(false);
  };

  const handleMaterialsDialogClose = () => {
    setShowMaterialsDialog(false);
    resetForm();
    if (!inline) {
      onOpenChange && onOpenChange(false);
    }
    onSuccess();
  };

  if (inline) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-2">Crear Nueva Lección</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="course">Curso</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                    {course.program?.title && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({course.program.title})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {requiresApproval && (
            <div>
              <Label htmlFor="approvalFormUrl">URL del Formulario de Aprobación</Label>
              <Input
                id="approvalFormUrl"
                value={approvalFormUrl}
                onChange={(e) => setApprovalFormUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/..."
                disabled={loading}
              />
            </div>
          )}

          {/* Sección de materiales - SIEMPRE DISPONIBLE */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasMaterials" 
                checked={hasMaterials} 
                onCheckedChange={(checked) => setHasMaterials(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="hasMaterials" className="text-sm font-medium">Cargar materiales al crear la lección</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Si marcas esta opción, se abrirá automáticamente el diálogo para cargar materiales inmediatamente después de crear la lección.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                'Crear Lección'
              )}
            </Button>
          </div>
        </form>

        {/* Diálogo de materiales */}
        {showMaterialsDialog && createdLessonId && (
          <LessonMaterialsDialog
            open={showMaterialsDialog}
            onOpenChange={handleMaterialsDialogClose}
            lessonId={createdLessonId}
            lessonTitle={title}
          />
        )}
      </div>
    );
  }

  return (
    <Dialog open={!!open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Lección</DialogTitle>
          <DialogDescription>Completa los campos y previsualiza la descripción en Markdown.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="course">Curso</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                    {course.program && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({course.program.title})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <SelectItem value="">Sin prerequisito</SelectItem>
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
          
          {/* Sección de materiales - SIEMPRE DISPONIBLE */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasMaterials" 
                checked={hasMaterials} 
                onCheckedChange={(checked) => setHasMaterials(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="hasMaterials" className="text-sm font-medium">Cargar materiales al crear la lección</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Si marcas esta opción, se abrirá automáticamente el diálogo para cargar materiales inmediatamente después de crear la lección.
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                'Crear Lección'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange && onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>

        {/* Diálogo de materiales */}
        {showMaterialsDialog && createdLessonId && (
          <LessonMaterialsDialog
            open={showMaterialsDialog}
            onOpenChange={handleMaterialsDialogClose}
            lessonId={createdLessonId}
            lessonTitle={title}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}