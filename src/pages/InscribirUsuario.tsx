import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Search, UserPlus, Loader2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useUserSearch } from '@/hooks/useUserSearch';
import { Autocomplete } from '@/components/ui/autocomplete';

interface Program {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
  program_id?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  programs?: string[];
  courses?: string[];
}

export default function InscribirUsuario() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Nuevo usuario
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'formador' | 'voluntario' | 'admin'>('student');
  const [createNewUser, setCreateNewUser] = useState(false);
  
  // Búsqueda de usuarios
  const { 
    searchTerm, 
    setSearchTerm, 
    users: searchResults, 
    loading: searchLoading, 
    autocompleteOptions 
  } = useUserSearch({ debounceMs: 300, minSearchLength: 2 });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Cargar programas y cursos
      const [programsRes, coursesRes] = await Promise.all([
        supabase.from('programs').select('id, title').order('title'),
        supabase.from('courses').select('id, title, program_id').order('title')
      ]);

      if (programsRes.error) throw programsRes.error;
      if (coursesRes.error) throw coursesRes.error;

      setPrograms(programsRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    setSearchTerm('');
    
    // Buscar el usuario seleccionado en los resultados
    const user = searchResults.find(u => u.id === userId);
    if (user) {
      // Pre-seleccionar programas y cursos del usuario
      setSelectedPrograms(user.programs || []);
      setSelectedCourses(user.courses || []);
    }
  };

  const handleProgramToggle = (programId: string) => {
    setSelectedPrograms(prev => 
      prev.includes(programId) 
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedUser && !createNewUser) {
      toast({
        title: "Error",
        description: "Debes seleccionar un usuario o crear uno nuevo",
        variant: "destructive"
      });
      return;
    }

    if (createNewUser && (!newEmail || !newName)) {
      toast({
        title: "Error",
        description: "Debes completar email y nombre para crear un usuario",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      let userId = selectedUser;

      // Crear nuevo usuario si es necesario
      if (createNewUser) {
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: newEmail,
          password: newPassword || undefined,
          user_metadata: {
            full_name: newName,
            role: newRole
          }
        });

        if (userError) throw userError;
        userId = userData.user.id;

        // Crear perfil
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: newName,
            role: newRole
          });

        if (profileError) throw profileError;
      }

      // Inscribir en programas
      if (selectedPrograms.length > 0) {
        const programEnrollments = selectedPrograms.map(programId => ({
          user_id: userId,
          program_id: programId,
          status: 'active'
        }));

        const { error: programError } = await supabase
          .from('enrollments')
          .upsert(programEnrollments, { onConflict: 'user_id,program_id' });

        if (programError) throw programError;
      }

      // Inscribir en cursos
      if (selectedCourses.length > 0) {
        const courseEnrollments = selectedCourses.map(courseId => ({
          user_id: userId,
          course_id: courseId,
          status: 'active'
        }));

        const { error: courseError } = await supabase
          .from('course_enrollments')
          .upsert(courseEnrollments, { onConflict: 'user_id,course_id' });

        if (courseError) throw courseError;
      }

      toast({
        title: "Éxito",
        description: createNewUser 
          ? "Usuario creado e inscrito exitosamente" 
          : "Usuario inscrito exitosamente"
      });

      // Limpiar formulario
      setSelectedUser('');
      setSelectedPrograms([]);
      setSelectedCourses([]);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('student');
      setCreateNewUser(false);
      setSearchTerm('');

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la inscripción",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'formador':
      case 'teacher':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'voluntario':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'student':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrador';
      case 'formador':
      case 'teacher':
        return 'Formador';
      case 'voluntario':
        return 'Voluntario';
      case 'student':
      default:
        return 'Estudiante';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inscribir Usuario</h1>
        <p className="text-muted-foreground">Inscribe usuarios en programas y cursos</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Selección de usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Seleccionar Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar usuario existente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {searchLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando usuarios...
                </div>
              )}

              {searchTerm && searchTerm.length >= 2 && !searchLoading && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No se encontraron usuarios
                    </p>
                  ) : (
                    searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => handleUserSelect(user.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {user.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge className={getRoleColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createNew"
                  checked={createNewUser}
                  onCheckedChange={(checked) => setCreateNewUser(checked as boolean)}
                />
                <Label htmlFor="createNew" className="text-sm font-medium">
                  Crear nuevo usuario
                </Label>
              </div>

              {createNewUser && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="newEmail">Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newName">Nombre completo</Label>
                    <Input
                      id="newName"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nombre del usuario"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Contraseña (opcional)</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Dejar vacío para envío de link mágico"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newRole">Rol</Label>
                    <Select value={newRole} onValueChange={(value: any) => setNewRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Estudiante</SelectItem>
                        <SelectItem value="formador">Formador</SelectItem>
                        <SelectItem value="voluntario">Voluntario</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selección de programas y cursos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              Programas y Cursos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Programas */}
            <div>
              <Label className="text-base font-medium">Programas</Label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {programs.map((program) => (
                  <div key={program.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`program-${program.id}`}
                      checked={selectedPrograms.includes(program.id)}
                      onCheckedChange={() => handleProgramToggle(program.id)}
                    />
                    <Label
                      htmlFor={`program-${program.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {program.title}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Cursos */}
            <div>
              <Label className="text-base font-medium">Cursos</Label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`course-${course.id}`}
                      checked={selectedCourses.includes(course.id)}
                      onCheckedChange={() => handleCourseToggle(course.id)}
                    />
                    <Label
                      htmlFor={`course-${course.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {course.title}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen */}
            {(selectedPrograms.length > 0 || selectedCourses.length > 0) && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Resumen de inscripción:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {selectedPrograms.length > 0 && (
                    <p>• {selectedPrograms.length} programa(s) seleccionado(s)</p>
                  )}
                  {selectedCourses.length > 0 && (
                    <p>• {selectedCourses.length} curso(s) seleccionado(s)</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Botón de envío */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={submitting || (!selectedUser && !createNewUser)}
          className="gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {submitting ? 'Procesando...' : 'Inscribir Usuario'}
        </Button>
      </div>
    </div>
  );
}