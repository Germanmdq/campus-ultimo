import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  published_at?: string;
}

interface AddLessonsToCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  onSuccess: () => void;
}

export function AddLessonsToCourseDialog({ 
  open, 
  onOpenChange, 
  courseId, 
  onSuccess 
}: AddLessonsToCourseDialogProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAvailableLessons();
    }
  }, [open, courseId]);

  const fetchAvailableLessons = async () => {
    try {
      // 🔍 PASO 1: Obtener lecciones que YA están en este curso
      const { data: existingLessons } = await supabase
        .from('lesson_courses')
        .select('lesson_id')
        .eq('course_id', courseId);

      const existingLessonIds = existingLessons?.map(lc => lc.lesson_id) || [];

      // 📚 PASO 2: Obtener TODAS las lecciones EXCEPTO las que ya están en el curso
      let query = supabase
        .from('lessons')
        .select('id, title, description, published_at')
        .order('title');

      // ⚡ FILTRO: Solo aplicar si hay lecciones existentes
      if (existingLessonIds.length > 0) {
        query = query.not('id', 'in', `(${existingLessonIds.join(',')})`);
      }

      const { data: allLessons, error } = await query;

      if (error) throw error;
      setLessons(allLessons || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las lecciones disponibles",
        variant: "destructive",
      });
    }
  };

  // ✅ TOGGLE: Seleccionar/deseleccionar lecciones individuales
  const handleLessonToggle = (lessonId: string) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)  // ❌ Quitar si ya está seleccionado
        : [...prev, lessonId]                // ✅ Agregar si no está seleccionado
    );
  };

  // 🚀 FUNCIÓN PRINCIPAL: Agregar lecciones seleccionadas al curso
  const handleAddLessons = async () => {
    // ⚠️ VALIDACIÓN: Debe haber al menos una lección seleccionada
    if (selectedLessons.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos una lección",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 🔢 PASO 1: Obtener el sort_order más alto del curso
      const { data: maxOrder } = await supabase
        .from('lesson_courses')
        .select('sort_order')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const startOrder = (maxOrder?.[0]?.sort_order || 0) + 1;

      // 📝 PASO 2: Preparar datos para insertar en lesson_courses
      const lessonCourses = selectedLessons.map((lessonId, index) => ({
        course_id: courseId,           // ID del curso
        lesson_id: lessonId,           // ID de la lección
        sort_order: startOrder + index // Orden secuencial
      }));

      // 💾 PASO 3: Insertar en la base de datos
      const { error } = await supabase
        .from('lesson_courses')
        .insert(lessonCourses);

      if (error) throw error;

      // ✅ ÉXITO: Mostrar mensaje y cerrar diálogo
      toast({
        title: "Lecciones agregadas",
        description: `Se agregaron ${selectedLessons.length} lección(es) al curso`,
      });

      setSelectedLessons([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      // ❌ ERROR: Mostrar mensaje de error
      toast({
        title: "Error",
        description: "No se pudieron agregar las lecciones al curso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔍 FILTRO: Buscar lecciones por título y descripción
  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.description && lesson.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar Lecciones al Curso</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          {/* 🔍 CAMPO DE BÚSQUEDA */}
          <div>
            <Label>Buscar lecciones</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 📚 LISTA DE LECCIONES DISPONIBLES */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredLessons.length === 0 ? (
              // 🚫 ESTADO VACÍO: No hay lecciones disponibles
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay lecciones disponibles para agregar</p>
                <p className="text-sm mt-2">
                  {searchTerm ? 'Prueba con otros términos de búsqueda' : 'Todas las lecciones ya están en este curso'}
                </p>
              </div>
            ) : (
              // ✅ LISTA DE LECCIONES: Con checkboxes para seleccionar
              filteredLessons.map(lesson => (
                <Card key={lesson.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* ☑️ CHECKBOX: Para seleccionar la lección */}
                      <Checkbox
                        checked={selectedLessons.includes(lesson.id)}
                        onCheckedChange={() => handleLessonToggle(lesson.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-foreground">{lesson.title}</h4>
                          {/* 🏷️ BADGE: Estado de la lección (Publicada/Borrador) */}
                          <Badge variant={lesson.published_at ? "default" : "secondary"}>
                            {lesson.published_at ? "Publicada" : "Borrador"}
                          </Badge>
                        </div>
                        {/* 📝 DESCRIPCIÓN: Descripción de la lección */}
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 🎯 BOTONES DE ACCIÓN */}
        <div className="flex gap-2 pt-4 border-t">
          {/* ✅ BOTÓN PRINCIPAL: Agregar lecciones seleccionadas */}
          <Button 
            onClick={handleAddLessons} 
            disabled={loading || selectedLessons.length === 0}
            className="flex-1"
          >
            {loading ? 'Agregando...' : `Agregar ${selectedLessons.length} lección(es)`}
          </Button>
          {/* ❌ BOTÓN SECUNDARIO: Cancelar operación */}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
