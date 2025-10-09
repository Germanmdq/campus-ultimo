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
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [hasAssignment, setHasAssignment] = useState(false);
  const [assignmentInstructions, setAssignmentInstructions] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approvalFormUrl, setApprovalFormUrl] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
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
      fetchAvailableCourses();
    } else if (open) {
      fetchCourses();
      fetchAvailableCourses();
    }
  }, [open, inline]);

  useEffect(() => {
    if (selectedCourses.length > 0) { // Solo buscar prerequisitos si hay cursos seleccionados
      fetchPrerequisites();
    }
  }, [selectedCourses]); // Dependencia solo en selectedCourses

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

  const fetchAvailableCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    setAvailableCourses(data || []);
  };

  const fetchPrerequisites = async () => {
    if (selectedCourses.length === 0) { // Si no hay cursos seleccionados, no hay prerequisitos
      setPrerequisites([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, 
          title, 
          sort_order,
          lesson_courses!inner (course_id)
        `)
        .in('lesson_courses.course_id', selectedCourses)
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

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || selectedCourses.length === 0) {
      toast({
        title: "Error",
        description: "Título y al menos un curso son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (selectedCourses.length === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos un curso", variant: "destructive" });
      return;
    }

    setLoading(true);
    console.log('🔥 INICIO handleSubmit');
    try {
      const baseSlug = generateSlug(title.trim());
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const uniqueSlug = `${baseSlug}-${randomSuffix}`;
      console.log('🔥 Slug generado:', uniqueSlug);
      // 1. Crear la lección (sin course_id ya que usaremos lesson_courses)
      console.log('🔥 Insertando lección con datos:', {
        title: title.trim(),
        slug: uniqueSlug,
        course_id: selectedCourses[0]
      });
      const { data, error } = await supabase
        .from('lessons')
        .insert([{
          title: title.trim(),
          description: description.trim() || null,
          slug: uniqueSlug,
          course_id: selectedCourses[0], // Asignar el primer curso como principal (requerido por la tabla lessons)
          video_url: videoUrl.trim() || null,
          duration_minutes: duration ? parseInt(duration) : 0,
          has_assignment: hasAssignment,
          assignment_instructions: hasAssignment ? assignmentInstructions.trim() || null : null,
          requires_admin_approval: requiresApproval,
          approval_form_url: hasAssignment ? (approvalFormUrl.trim() || null) : null,
          prerequisite_lesson_id: (prerequisiteId && prerequisiteId !== 'none') ? prerequisiteId : null,
          has_materials: hasMaterials, // Este campo ahora se usa para indicar si tiene materiales
          sort_order: prerequisites.length + 1, // Orden de la lección
        }])
        .select('id')
        .single();

      if (error) throw error;

      console.log('🔥 Lección creada con ID:', data.id);
      if (!data?.id) throw new Error("No se pudo obtener el ID de la lección creada.");

      // 2. Crear las relaciones en lesson_courses (many-to-many)
      const lessonCourseInserts = selectedCourses.map((courseId, index) => ({
        lesson_id: data.id,
        course_id: courseId,
        sort_order: index
      }));

      const { error: relationError } = await supabase
        .from('lesson_courses')
        .insert(lessonCourseInserts);

      if (relationError) throw relationError;
      console.log('🔥 Relaciones creadas exitosamente');

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
      console.error('🔥 ERROR COMPLETO:', error);
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
    setSelectedCourses([]);
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
          <div className="space-y-2">
            <Label>Asignar a cursos (selecciona uno o varios)</Label>
            <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto">
              {availableCourses.map(course => (
                <div key={course.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCourses(prev =>
                        checked
                          ? [...prev, course.id]
                          : prev.filter(id => id !== course.id)
                      );
                    }}
                  />
                  <label>{course.title}</label>
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
            <> {/* Agrupamos estos campos para que aparezcan juntos si hasAssignment es true */}
              <div>
                <Label htmlFor="assignmentInstructions">Instrucciones de la Tarea</Label>
                <Textarea id="assignmentInstructions" value={assignmentInstructions} onChange={(e) => setAssignmentInstructions(e.target.value)} placeholder="Instrucciones para el estudiante..." rows={3} disabled={loading} />
              </div>
              <div>
                <Label htmlFor="approvalFormUrl">URL del Trabajo Práctico</Label>
                <Input id="approvalFormUrl" value={approvalFormUrl} onChange={(e) => setApprovalFormUrl(e.target.value)} placeholder="https://docs.google.com/forms/..." disabled={loading} />
                <p className="text-xs text-muted-foreground mt-1">
                  URL donde el estudiante completa y entrega el trabajo práctico
                </p>
              </div>
            </>
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
          <div className="space-y-2">
            <Label>Asignar a cursos</Label>
            <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto">
              {availableCourses.map(course => (
                <div key={course.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCourses(prev =>
                        checked
                          ? [...prev, course.id]
                          : prev.filter(id => id !== course.id)
                      );
                    }}
                  />
                  <label>{course.title}</label>
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
            <>
              <div>
                <Label htmlFor="assignmentInstructions">Instrucciones de la Tarea</Label>
                <Textarea id="assignmentInstructions" value={assignmentInstructions} onChange={(e) => setAssignmentInstructions(e.target.value)} placeholder="Instrucciones para el estudiante..." rows={3} disabled={loading} />
              </div>
              <div>
                <Label htmlFor="approvalFormUrl">URL de Entrega (Dropbox, etc.)</Label>
                <Input id="approvalFormUrl" value={approvalFormUrl} onChange={(e) => setApprovalFormUrl(e.target.value)} placeholder="https://www.dropbox.com/request/..." disabled={loading} />
              </div>
            </>
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
            onClose={handleMaterialsDialogClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}