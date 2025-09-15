import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Users, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePrograms } from '@/hooks/usePrograms';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreateProgramForm } from '@/components/admin/CreateProgramForm';
import { CreateCourseForProgramDialog } from '@/components/admin/CreateCourseForProgramDialog';

export default function Programas() {
  const { profile } = useAuth();
  const { programs, loading, error, refetch } = usePrograms();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<{ id: string; title: string } | null>(null);
  const role = (profile?.role || '').toString();
  const isTeacherOrAdmin = ['formador','teacher','profesor','admin'].includes(role);

  const handleCreateProgram = () => {
    setShowCreateForm(true);
  };

  const handleCreateCourse = (programId: string, programTitle: string) => {
    setSelectedProgram({ id: programId, title: programTitle });
    setShowCreateCourse(true);
  };

  const handleDeleteProgram = async (programId: string, programTitle: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el programa "${programTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      toast({
        title: "Programa eliminado",
        description: `El programa "${programTitle}" ha sido eliminado exitosamente`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el programa",
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

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error al cargar programas: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Programas</h1>
          <p className="text-muted-foreground">
            {isTeacherOrAdmin ? 'Gestiona los programas de estudio' : 'Explora los programas disponibles'}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <div className="flex gap-2">
            <Button className="gap-2" onClick={handleCreateProgram}>
              <Plus className="h-4 w-4" />
              Nuevo Programa
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {programs.map((program) => {
          const averageProgress = program.courses?.reduce((acc, course) => 
            acc + (course.progress_percent || 0), 0
          ) / (program.courses?.length || 1) || 0;
          
          const hasProgress = averageProgress > 0;
          const coursesCount = program.courses?.length || 0;
          const isPublished = !!program.published_at;
          
          return (
            <Card key={program.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
              <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                {program.poster_2x3_url || program.wide_11x6_url ? (
                  <img 
                    src={program.poster_2x3_url || program.wide_11x6_url} 
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${isPublished ? 'from-accent/20 to-accent/10' : 'from-muted/20 to-muted/10'} flex items-center justify-center`}>
                    <BookOpen className={`h-16 w-16 ${isPublished ? 'text-accent' : 'text-muted'}`} />
                  </div>
                )}
                {hasProgress && isPublished && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-accent text-white">
                      {Math.round(averageProgress)}% completo
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                  {program.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {program.summary || 'Descubre los secretos de la geometría sagrada'}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={isPublished ? "default" : "secondary"}>
                    {isPublished ? "Publicado" : "Borrador"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span>{coursesCount} cursos</span>
                  </div>
                </div>
                
                {/* Lista de cursos */}
                {program.courses && program.courses.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Cursos incluidos:</p>
                    <div className="space-y-1">
                      {program.courses.slice(0, 3).map((course) => (
                        <div key={course.id} className="text-xs text-foreground flex items-center justify-between">
                          <span className="truncate">{course.title}</span>
                          {course.progress_percent !== undefined && (
                            <span className="text-muted-foreground ml-2">{course.progress_percent}%</span>
                          )}
                        </div>
                      ))}
                      {program.courses.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{program.courses.length - 3} cursos más
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {isTeacherOrAdmin ? (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/programas/${program.slug}`)}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleCreateCourse(program.id, program.title)}
                      >
                        + Curso
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteProgram(program.id, program.title)}
                      >
                        Eliminar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/programa/${program.slug}`)}
                      >
                        Ver
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="w-full" disabled={!isPublished}>
                      {isPublished ? (hasProgress ? "Continuar" : "Comenzar") : "No Disponible"}
                    </Button>
                  )}
                </div>
                
                {hasProgress && isPublished && (
                  <div className="w-full bg-border rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-accent h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${averageProgress}%` }}
                    ></div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Crear nuevo programa - Solo para profesores y admins */}
        {isTeacherOrAdmin && (
          <Card className="border-dashed">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center aspect-[2/3]">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Crear Programa</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Agrega un nuevo programa de estudio
              </p>
              <Button onClick={handleCreateProgram}>Crear Programa</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-2">{programs.length}</p>
            <p className="text-xs text-muted-foreground">Programas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Cursos</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {programs.reduce((acc, p) => acc + (p.courses?.length || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Publicados</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {programs.filter(p => p.published_at).length}
            </p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Borradores</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {programs.filter(p => !p.published_at).length}
            </p>
            <p className="text-xs text-muted-foreground">En desarrollo</p>
          </CardContent>
        </Card>
      </div>

      <CreateProgramForm 
        open={showCreateForm} 
        onOpenChange={setShowCreateForm}
        onSuccess={refetch}
      />
      
      {selectedProgram && (
        <CreateCourseForProgramDialog
          open={showCreateCourse}
          onOpenChange={setShowCreateCourse}
          onSuccess={refetch}
          programId={selectedProgram.id}
          programTitle={selectedProgram.title}
        />
      )}
    </div>
  );
}