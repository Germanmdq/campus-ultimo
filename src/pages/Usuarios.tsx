import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Search, UserCheck, UserX, Crown, GraduationCap, Loader2, Eye, Filter, X, Trash2, Edit, UserPlus, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { UserProfileDialog } from '@/components/admin/UserProfileDialog';
import { EditUserProfileDialog } from '@/components/admin/EditUserProfileDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/useDebounce';
import { useUserSearch } from '@/hooks/useUserSearch';

interface User {
  id: string;
  name: string;
  full_name: string;
  email: string;
  role: 'student' | 'formador' | 'voluntario' | 'admin';
  status: 'active' | 'inactive';
  enrolledPrograms: number;
  joinedAt: string;
  lastSignInAt?: string | null;
  programs?: string[];
  courses?: string[];
}

interface DeleteUserResponse {
  success: boolean;
  message?: string;
  error?: string;
  email?: string;
}

interface Program {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
  program_id?: string;
}

export default function Usuarios() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('todos');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [roleCounts, setRoleCounts] = useState<{ total: number; student: number; teacher: number; admin: number; voluntario: number } | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'email'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para edición de perfil
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  
  // Formulario de inscripción
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Nuevo usuario
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'formador' | 'voluntario' | 'admin'>('student');
  const [createNewUser, setCreateNewUser] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const { 
    users: searchResults, 
    loading: searchLoading, 
    autocompleteOptions 
  } = useUserSearch({ debounceMs: 300, minSearchLength: 2 });

  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isTeacherOrAdmin) {
      fetchUsers();
      fetchProgramsAndCourses();
    }
  }, [isTeacherOrAdmin, filterRole, debouncedSearchTerm, page, sortBy, sortDir]);

  // Reset page when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== '') {
      setPage(1);
    }
  }, [debouncedSearchTerm]);

  const fetchProgramsAndCourses = async () => {
    try {
      const [programsRes, coursesRes] = await Promise.all([
        supabase.from('programs').select('id, title').order('title'),
        supabase.from('courses').select('id, title, program_id').order('title')
      ]);

      if (programsRes.error) throw programsRes.error;
      if (coursesRes.error) throw coursesRes.error;

      setPrograms(programsRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (error: any) {
      console.error('Error fetching programs and courses:', error);
    }
  };

  const fetchUsers = async () => {
    if (!isTeacherOrAdmin) return;
    
    setLoading(true);
    try {
      // Intentar servidor: Edge Function list-users (role y search server-side, paginado)
      const params = new URLSearchParams();
      const roleParam = filterRole === 'formador' ? 'teacher' : filterRole; // map UI->DB
      params.set('role', roleParam);
      if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        });
        const json = await resp.json();
        if (json?.success && json?.data) {
          const arr: User[] = (json.data.users || []).map((u: any) => ({
            id: u.id,
            name: u.full_name || 'Sin nombre',
            full_name: u.full_name || 'Sin nombre',
            email: u.email || 'Sin email',
            role: (u.role === 'teacher' ? 'formador' : (u.role || 'student')) as 'student' | 'formador' | 'voluntario' | 'admin',
            status: 'active',
            enrolledPrograms: u.program_enrollments ?? 0,
            joinedAt: u.created_at || new Date().toISOString(),
            lastSignInAt: u.last_sign_in_at || null,
            programs: u.programs || [],
            courses: u.courses || [],
          }));
          setUsers(arr);
          setTotal(json.data.total || arr.length);
          setRoleCounts(json.data.counts || null);
          return;
        }
      } catch (e) {
        console.warn('list-users fallback:', e);
      }

      // Consulta SOLO a la tabla profiles (sin auth.users por permisos)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Usar solo datos de profiles (sin consultar auth.users)
      const profilesWithAuth = (profilesData || []).map((profile: any) => ({
        ...profile,
        email: profile.email || 'Sin email',
        auth_full_name: profile.full_name || 'Sin nombre',
        last_sign_in_at: null // No disponible sin auth.users
      }));

      const roleFilter = (u: any) => {
        if (filterRole === 'todos') return true;
        // Mapeo completo de roles DB -> UI
        let mapped = u.role;
        if (u.role === 'teacher') mapped = 'formador';
        return mapped === filterRole;
      };
      const searchFilter = (u: any) => {
        if (!debouncedSearchTerm) return true;
        const searchLower = debouncedSearchTerm.toLowerCase();
        const nameMatch = (u.auth_full_name || '').toLowerCase().includes(searchLower);
        const emailMatch = (u.email || '').toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
      };
      
      console.log('Buscando usuarios con término:', debouncedSearchTerm);
      const filtered = profilesWithAuth.filter((u: any) => roleFilter(u) && searchFilter(u));
      console.log('Usuarios filtrados:', filtered.length, 'de', profilesWithAuth.length);
      setTotal(filtered.length);
      const paginated = filtered.slice((page-1)*pageSize, page*pageSize);
      const arr: User[] = paginated.map((u: any) => ({
        id: u.id,
        name: u.auth_full_name || 'Sin nombre',
        full_name: u.auth_full_name || 'Sin nombre',
        email: u.email || 'Sin email',
        role: (u.role === 'teacher' ? 'formador' : (u.role || 'student')) as 'student' | 'formador' | 'voluntario' | 'admin',
        status: 'active',
        enrolledPrograms: 0,
        joinedAt: u.created_at || new Date().toISOString(),
        lastSignInAt: u.last_sign_in_at || null,
      }));
      setUsers(arr);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios: " + (error.message || 'Error desconocido'),
        variant: "destructive",
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

  const handleEnrollmentSubmit = async () => {
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
        // Obtener token de sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No hay sesión activa');
        }

        // Llamar a la Edge Function
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: newEmail,
            full_name: newName,
            password: newPassword || undefined,
            role: newRole
          }
        });

        if (error) {
          console.error('Error en Edge Function:', error);
          throw new Error(error.message || 'Error llamando a la función de creación de usuario');
        }
        
        if (data?.error) {
          console.error('Error en respuesta:', data.error);
          throw new Error(data.error);
        }

        if (!data?.success || !data?.user?.id) {
          console.error('Datos de usuario no válidos:', data);
          throw new Error('No se pudo obtener el ID del usuario creado');
        }

        userId = data.user.id;
        console.log('Usuario creado exitosamente:', userId);
      }

      // Inscribir en programas
      if (selectedPrograms.length > 0) {
        const programEnrollments = selectedPrograms.map(programId => ({
          user_id: userId,
          program_id: programId,
          status: 'active' as const
        }));

        const { error: programError } = await supabase
          .from('enrollments')
          .upsert(programEnrollments);

        if (programError) throw programError;

        // Inscribir automáticamente en todos los cursos de los programas seleccionados
        for (const programId of selectedPrograms) {
          // Obtener todos los cursos del programa
          const { data: programCourses, error: coursesError } = await supabase
            .from('program_courses')
            .select('course_id')
            .eq('program_id', programId);

          if (coursesError) {
            console.warn(`Error getting courses for program ${programId}:`, coursesError);
            continue;
          }

          if (programCourses && programCourses.length > 0) {
            // Crear inscripciones en course_enrollments para cada curso del programa
            const courseEnrollments = programCourses.map(pc => ({
              user_id: userId,
              course_id: pc.course_id,
              status: 'active' as const,
              progress_percent: 0
            }));

            const { error: courseEnrollmentError } = await supabase
              .from('course_enrollments')
              .upsert(courseEnrollments);

            if (courseEnrollmentError) {
              console.warn(`Error enrolling in courses for program ${programId}:`, courseEnrollmentError);
            }
          }
        }
      }

      // Inscribir en cursos
      if (selectedCourses.length > 0) {
        const courseEnrollments = selectedCourses.map(courseId => ({
          user_id: userId,
          course_id: courseId,
          status: 'active' as const
        }));

        const { error: courseError } = await supabase
          .from('course_enrollments')
          .upsert(courseEnrollments);

        if (courseError) throw courseError;
      }

      toast({
        title: "Éxito",
        description: createNewUser 
          ? "Usuario creado e inscrito exitosamente" 
          : "Usuario inscrito exitosamente"
      });

      // Limpiar formulario y recargar usuarios
      setSelectedUser('');
      setSelectedPrograms([]);
      setSelectedCourses([]);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('student');
      setCreateNewUser(false);
      setSearchTerm('');
      setShowEnrollmentForm(false);
      fetchUsers();

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

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
    
    const user = users.find(u => u.id === userId);
    toast({
      title: `Usuario ${user?.status === 'active' ? 'desactivado' : 'activado'}`,
      description: `El usuario ${user?.name} ha sido ${user?.status === 'active' ? 'desactivado' : 'activado'}`,
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) return;

    try {
      // ✅ USA SOLO RPC - No uses fetch ni admin endpoints
      const { data, error } = await supabase.rpc('delete_user_simple', {
        user_id: userId
      });

      if (error) {
        console.error('Error RPC:', error);
        throw new Error(error.message);
      }

      // data ya es el objeto JSONB que devuelve la función
      const result = data;

      if (result.success) {
        setUsers(users.filter(u => u.id !== userId));
        toast({
          title: "Usuario eliminado",
          description: `${result.message}: ${result.email}`
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error eliminando usuario:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user as any);
    setShowEditProfile(true);
  };

  const handleEditSuccess = () => {
    setShowEditProfile(false);
    setUserToEdit(null);
    fetchUsers(); // Refresh the users list
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isTeacherOrAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acceso denegado</h3>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona todos los usuarios del campus</p>
        </div>
        <Button onClick={() => setShowEnrollmentForm(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Inscribir Usuario
        </Button>
      </div>

      {/* Estadísticas de roles */}
      {roleCounts && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{roleCounts.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Estudiantes</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">{roleCounts.student}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Formadores</span>
              </div>
              <p className="text-2xl font-bold text-purple-500">{roleCounts.teacher}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Voluntarios</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{roleCounts.voluntario}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:w-64"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  <SelectItem value="student">Estudiantes</SelectItem>
                  <SelectItem value="formador">Formadores</SelectItem>
                  <SelectItem value="voluntario">Voluntarios</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
              <p className="text-muted-foreground">No se encontraron usuarios con los filtros aplicados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {(user.full_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Registrado: {formatDate(user.joinedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Abriendo perfil para usuario:', user.id, user.full_name);
                        setSelectedUserId(user.id);
                        setShowUserProfile(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user.id)}
                        >
                          {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón para abrir formulario de inscripción en nueva pantalla */}
      {showEnrollmentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" />
                Inscribir Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Selección de usuario */}
                <div className="space-y-4">
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

                    {/* Mostrar todos los usuarios disponibles */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {users.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay usuarios disponibles
                        </p>
                      ) : (
                        users
                          .filter(user => 
                            !searchTerm || 
                            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((user) => (
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
                </div>

                {/* Selección de programas y cursos */}
                <div className="space-y-6">
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
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEnrollmentForm(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleEnrollmentSubmit} 
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog de perfil de usuario */}
      <UserProfileDialog
        userId={selectedUserId}
        open={showUserProfile}
        onOpenChange={setShowUserProfile}
      />

      {/* Dialog de edición de perfil */}
      {userToEdit && (
        <EditUserProfileDialog
          user={userToEdit}
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}