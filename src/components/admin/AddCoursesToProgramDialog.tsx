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

interface Course {
  id: string;
  title: string;
  summary?: string;
  published_at?: string;
}

interface AddCoursesToProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  onSuccess: () => void;
}

export function AddCoursesToProgramDialog({ 
  open, 
  onOpenChange, 
  programId, 
  onSuccess 
}: AddCoursesToProgramDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAvailableCourses();
    }
  }, [open, programId]);

  const fetchAvailableCourses = async () => {
    try {
      // 🔍 PASO 1: Obtener cursos que YA están en este programa
      const { data: existingCourses } = await supabase
        .from('program_courses')
        .select('course_id')
        .eq('program_id', programId);

      const existingCourseIds = existingCourses?.map(pc => pc.course_id) || [];

      // 📚 PASO 2: Obtener TODOS los cursos EXCEPTO los que ya están en el programa
      let query = supabase
        .from('courses')
        .select('id, title, summary, published_at')
        .order('title');

      // ⚡ FILTRO: Solo aplicar si hay cursos existentes
      if (existingCourseIds.length > 0) {
        query = query.not('id', 'in', `(${existingCourseIds.join(',')})`);
      }

      const { data: allCourses, error } = await query;

      if (error) throw error;
      setCourses(allCourses || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los cursos disponibles",
        variant: "destructive",
      });
    }
  };

  // ✅ TOGGLE: Seleccionar/deseleccionar cursos individuales
  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)  // ❌ Quitar si ya está seleccionado
        : [...prev, courseId]                // ✅ Agregar si no está seleccionado
    );
  };

  // 🚀 FUNCIÓN PRINCIPAL: Agregar cursos seleccionados al programa
  const handleAddCourses = async () => {
    // ⚠️ VALIDACIÓN: Debe haber al menos un curso seleccionado
    if (selectedCourses.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un curso",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 🔢 PASO 1: Obtener el sort_order más alto del programa
      const { data: maxOrder } = await supabase
        .from('program_courses')
        .select('sort_order')
        .eq('program_id', programId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const startOrder = (maxOrder?.[0]?.sort_order || 0) + 1;

      // 📝 PASO 2: Preparar datos para insertar en program_courses
      const programCourses = selectedCourses.map((courseId, index) => ({
        program_id: programId,           // ID del programa
        course_id: courseId,            // ID del curso
        sort_order: startOrder + index  // Orden secuencial
      }));

      // 💾 PASO 3: Insertar en la base de datos
      const { error } = await supabase
        .from('program_courses')
        .insert(programCourses);

      if (error) throw error;

      // ✅ ÉXITO: Mostrar mensaje y cerrar diálogo
      toast({
        title: "Cursos agregados",
        description: `Se agregaron ${selectedCourses.length} curso(s) al programa`,
      });

      setSelectedCourses([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      // ❌ ERROR: Mostrar mensaje de error
      toast({
        title: "Error",
        description: "No se pudieron agregar los cursos al programa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔍 FILTRO: Buscar cursos por título y descripción
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.summary && course.summary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar Cursos al Programa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          {/* 🔍 CAMPO DE BÚSQUEDA */}
          <div>
            <Label>Buscar cursos</Label>
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

          {/* 📚 LISTA DE CURSOS DISPONIBLES */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredCourses.length === 0 ? (
              // 🚫 ESTADO VACÍO: No hay cursos disponibles
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay cursos disponibles para agregar</p>
                <p className="text-sm mt-2">
                  {searchTerm ? 'Prueba con otros términos de búsqueda' : 'Todos los cursos ya están en este programa'}
                </p>
              </div>
            ) : (
              // ✅ LISTA DE CURSOS: Con checkboxes para seleccionar
              filteredCourses.map(course => (
                <Card key={course.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* ☑️ CHECKBOX: Para seleccionar el curso */}
                      <Checkbox
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => handleCourseToggle(course.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-foreground">{course.title}</h4>
                          {/* 🏷️ BADGE: Estado del curso (Publicado/Borrador) */}
                          <Badge variant={course.published_at ? "default" : "secondary"}>
                            {course.published_at ? "Publicado" : "Borrador"}
                          </Badge>
                        </div>
                        {/* 📝 RESUMEN: Descripción del curso */}
                        {course.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.summary}
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
          {/* ✅ BOTÓN PRINCIPAL: Agregar cursos seleccionados */}
          <Button 
            onClick={handleAddCourses} 
            disabled={loading || selectedCourses.length === 0}
            className="flex-1"
          >
            {loading ? 'Agregando...' : `Agregar ${selectedCourses.length} curso(s)`}
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