import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, UserCheck, UserX, Crown, GraduationCap, Loader2, Eye, Filter, X, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { UserProfileDialog } from '@/components/admin/UserProfileDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/useDebounce';
import { useUserSearch } from '@/hooks/useUserSearch';
import { Autocomplete } from '@/components/ui/autocomplete';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'formador' | 'voluntario' | 'admin';
  status: 'active' | 'inactive';
  enrolledPrograms: number;
  joinedAt: string;
  lastSignInAt?: string | null;
  programs?: string[];
  courses?: string[];
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
  
  // Debounce para optimizar búsquedas
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Hook de búsqueda con autocompletado
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
    }
  }, [isTeacherOrAdmin, filterRole, debouncedSearchTerm, page, sortBy, sortDir]);

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
            name: (u.full_name && String(u.full_name).trim()) ? u.full_name : ((u.email || '').split('@')[0] || 'Sin nombre'),
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

      // Fallback: RPC existente
      const { data: usersWithEmails, error: usersError } = await supabase.rpc('get_users_with_emails');
      if (usersError) throw usersError;

      const roleFilter = (u: any) => {
        if (filterRole === 'todos') return true;
        const mapped = u.role === 'teacher' ? 'formador' : u.role;
        return mapped === filterRole;
      };
      const searchFilter = (u: any) => {
        if (!searchTerm) return true;
        return (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      };
      const filtered = (usersWithEmails || []).filter((u: any) => roleFilter(u) && searchFilter(u));
      setTotal(filtered.length);
      const paginated = filtered.slice((page-1)*pageSize, page*pageSize);
      const arr: User[] = paginated.map((u: any) => ({
        id: u.id,
        name: (u.full_name && String(u.full_name).trim()) ? u.full_name : ((u.email || '').split('@')[0] || 'Sin nombre'),
        email: u.email || 'Sin email',
        role: (u.role === 'teacher' ? 'formador' : (u.role || 'student')) as 'student' | 'formador' | 'voluntario' | 'admin',
        status: 'active',
        enrolledPrograms: 0,
        joinedAt: u.created_at || new Date().toISOString(),
        lastSignInAt: null,
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

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
    
    const user = users.find(u => u.id === userId);
    toast({
      title: `Usuario ${user?.status === 'active' ? 'desactivado' : 'activado'}`,
      description: `${user?.name} ha sido ${user?.status === 'active' ? 'desactivado' : 'activado'} exitosamente`,
    });
  };

  const handleChangeRole = (userId: string, newRole: 'student' | 'formador' | 'voluntario' | 'admin') => {
    if (!isAdmin) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden cambiar roles",
        variant: "destructive",
      });
      return;
    }

    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
    
    const user = users.find(u => u.id === userId);
    toast({
      title: "Rol actualizado",
      description: `${user?.name} ahora es ${newRole === 'admin' ? 'administrador' : newRole === 'formador' ? 'formador' : newRole === 'voluntario' ? 'voluntario' : 'estudiante'}`,
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden eliminar usuarios",
        variant: "destructive",
      });
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar a ${user.name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Delete from profiles table (this will cascade to other tables)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Remove from local state
      setUsers(users.filter(u => u.id !== userId));
      setTotal(prev => prev - 1);

      toast({
        title: "Usuario eliminado",
        description: `${user.name} fue eliminado exitosamente`,
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users; // ya vienen filtrados/paginados desde el servidor o fallback

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'formador': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'voluntario': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'formador': return 'Formador';
      case 'voluntario': return 'Voluntario';
      case 'admin': return 'Admin';
      default: return 'Estudiante';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'formador': return <GraduationCap className="h-3 w-3" />;
      case 'voluntario': return <UserCheck className="h-3 w-3" />;
      case 'admin': return <Crown className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  if (!isTeacherOrAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground">No tienes permisos para ver esta sección</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los usuarios y sus inscripciones</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/inscribir-usuario')}>
          <Users className="h-4 w-4" />
          Inscribir Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Autocomplete
                value={searchTerm}
                onValueChange={setSearchTerm}
                placeholder="Buscar por nombre, email, programa o curso..."
                options={autocompleteOptions}
                loading={searchLoading}
                className="w-full"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  <SelectItem value="student">Estudiante</SelectItem>
                  <SelectItem value="formador">Formadores</SelectItem>
                  <SelectItem value="voluntario">Voluntarios</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Fecha de alta</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDir} onValueChange={(v) => setSortDir(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Dirección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  const roleParam = filterRole === 'formador' ? 'teacher' : filterRole;
                  params.set('role', roleParam);
                  if (searchTerm) params.set('search', searchTerm);
                  params.set('all', 'true');
                  params.set('sortBy', sortBy);
                  params.set('sortDir', sortDir);
                  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
                  });
                  const json = await resp.json();
                  if (!json?.success) throw new Error(json?.error || 'export_failed');
                  const rows = (json.data.users || []).map((u: any) => ({
                    id: u.id,
                    nombre: u.full_name || '',
                    email: u.email || '',
                    rol: u.role,
                    creado: u.created_at || '',
                    ultimo_acceso: u.last_sign_in_at || '',
                    programas: u.program_enrollments ?? 0,
                  }));
                  const headers = ['id','nombre','email','rol','creado','ultimo_acceso','programas'];
                  const lines = [headers.join(',')].concat(
                    rows.map((r: any) => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))
                  );
                  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const date = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
                  a.href = url; a.download = `usuarios-${date}.csv`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (e: any) {
                  toast({ title: 'Error', description: 'No se pudo exportar CSV', variant: 'destructive' });
                }
              }}
            >
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuarios */}
      <div className="space-y-4">
        {filteredUsers.map(user => (
          <Card key={user.id}>
            <CardContent className="p-6">
              {isMobile ? (
                // Versión móvil
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.lastSignInAt && (
                        <p className="text-xs text-muted-foreground">Último acceso: {formatDate(user.lastSignInAt)}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getRoleColor(user.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </div>
                    </Badge>
                    <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Badge variant="secondary">Programas: {user.enrolledPrograms}</Badge>
                    {user.programs && user.programs.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {user.programs.slice(0, 2).join(', ')}
                        {user.programs.length > 2 && ` +${user.programs.length - 2}`}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Desde {formatDate(user.joinedAt)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowUserProfile(true);
                      }}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Perfil
                    </Button>
                    
                    {isAdmin && (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleChangeRole(user.id, value as 'student' | 'formador' | 'voluntario' | 'admin')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Estudiante</SelectItem>
                          <SelectItem value="formador">Formador</SelectItem>
                          <SelectItem value="voluntario">Voluntario</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button
                      variant={user.status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleToggleUserStatus(user.id)}
                      className="w-full"
                    >
                      {user.status === 'active' ? (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                    
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowUserProfile(true);
                          }}
                          className="w-full"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // Versión desktop
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.lastSignInAt && (
                        <p className="text-xs text-muted-foreground">Último acceso: {formatDate(user.lastSignInAt)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={getRoleColor(user.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(user.role)}
                            {getRoleLabel(user.role)}
                          </div>
                        </Badge>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge variant="secondary">Programas: {user.enrolledPrograms}</Badge>
                        {user.programs && user.programs.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {user.programs.slice(0, 2).join(', ')}
                            {user.programs.length > 2 && ` +${user.programs.length - 2}`}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Desde {formatDate(user.joinedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowUserProfile(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Perfil
                    </Button>
                    
                    {isAdmin && (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleChangeRole(user.id, value as 'student' | 'formador' | 'voluntario' | 'admin')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Estudiante</SelectItem>
                          <SelectItem value="formador">Formador</SelectItem>
                          <SelectItem value="voluntario">Voluntario</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button
                      variant={user.status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleToggleUserStatus(user.id)}
                    >
                      {user.status === 'active' ? (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                    
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowUserProfile(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {/* Paginación */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p+1)}>Siguiente</Button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'md:grid-cols-4'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-2">{roleCounts?.total ?? users.length}</p>
            <p className="text-xs text-muted-foreground">Usuarios</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Activos</span>
            </div>
            <p className="text-2xl font-bold mt-2">{users.filter(u => u.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground">Usuarios</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Estudiantes</span>
            </div>
            <p className="text-2xl font-bold mt-2">{roleCounts?.student ?? users.filter(u => u.role === 'student').length}</p>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Staff</span>
            </div>
            <p className="text-2xl font-bold mt-2">{(roleCounts ? (roleCounts.teacher + (roleCounts.admin ?? 0)) : users.filter(u => u.role === 'formador' || u.role === 'admin').length)}</p>
            <p className="text-xs text-muted-foreground">Formadores/Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* User Profile Dialog */}
      {selectedUserId && (
        <UserProfileDialog
          open={showUserProfile}
          onOpenChange={setShowUserProfile}
          userId={selectedUserId}
        />
      )}
    </div>
  );
}