import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Monitor, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserStats } from '@/hooks/useUserStats';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { StorageDebug } from '@/components/debug/StorageDebug';

export default function Cuenta() {
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { stats } = useUserStats();
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    setName(profile?.full_name || '');
    setAvatarUrl(profile?.avatar_url || '');
    loadSessions();
  }, [profile?.full_name, profile?.avatar_url]);

  const handleAvatarChange = async (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
    
    // Guardar en la base de datos
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user?.id);

      if (error) {
        console.error('Error saving avatar URL:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar la foto de perfil",
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Foto guardada",
          description: "Tu foto de perfil se guardó correctamente",
        });
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la foto de perfil",
        variant: "destructive"
      });
    }
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      // Simulate multiple sessions for demo
      setSessions([
        {
          id: 'current',
          device: 'Chrome en macOS',
          location: 'Buenos Aires, Argentina',
          lastActive: new Date().toISOString(),
          current: true
        },
        {
          id: 'mobile',
          device: 'Safari en iPhone',
          location: 'Buenos Aires, Argentina',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          current: false
        }
      ]);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const getRoleColor = (role?: string) => {
    switch ((role || '').toLowerCase()) {
      case 'admin':
      case 'administrador':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'teacher':
      case 'formador':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'voluntario':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'student':
      case 'estudiante':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch ((role || '').toLowerCase()) {
      case 'admin':
      case 'administrador':
        return 'Administrador';
      case 'teacher':
      case 'formador':
        return 'Formador';
      case 'voluntario':
        return 'Voluntario';
      case 'student':
      case 'estudiante':
      default:
        return 'Estudiante';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSignOutAll = async () => {
    try {
      await signOut();
      toast({
        title: "Sesiones cerradas",
        description: "Todas las sesiones han sido cerradas exitosamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cerrar las sesiones",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mi Cuenta</h1>
        <p className="text-muted-foreground">Gestiona tu perfil y configuraciones</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Información del perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <AvatarUpload
              value={avatarUrl}
              onChange={handleAvatarChange}
              name={profile?.full_name || profile?.email || 'Usuario'}
              className="mb-4"
            />
            <div>
              <h3 className="text-xl font-semibold">{profile?.full_name || profile?.email || '—'}</h3>
              <Badge className={getRoleColor(profile?.role || 'student')}>
                {getRoleLabel(profile?.role || 'student')}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''} 
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  El email no se puede cambiar por seguridad
                </p>
              </div>

            </div>

            <Button onClick={async () => {
              if (!profile?.id) return;
              const { error } = await supabase
                .from('profiles')
                .update({ 
                  full_name: name.trim() || null,
                  avatar_url: avatarUrl || null
                })
                .eq('id', profile.id);
              if (error) {
                toast({ title: 'Error', description: error.message || 'No se pudo actualizar', variant: 'destructive' });
              } else {
                toast({ title: 'Perfil actualizado', description: 'Tu perfil fue guardado.' });
              }
            }}>Actualizar Perfil</Button>
          </CardContent>
        </Card>

        {/* Sesiones activas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-accent" />
              Sesiones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{session.device}</p>
                      <p className="text-sm text-muted-foreground">{session.location}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.current ? 'Sesión actual' : `Última actividad: ${formatDate(session.lastActive)}`}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button variant="outline" size="sm">
                      Cerrar Sesión
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Solo puedes tener 2 sesiones activas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Debug de Storage - TEMPORAL */}
      <StorageDebug />

      {/* Estadísticas del usuario (reales) */}
      <Card>
        <CardHeader>
          <CardTitle>Mi Progreso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{stats.active_programs}</p>
              <p className="text-sm text-muted-foreground">Programas Inscritos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{stats.completed_lessons}</p>
              <p className="text-sm text-muted-foreground">Lecciones Completadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{Math.floor((stats.total_study_time || 0)/60)}h {(stats.total_study_time || 0)%60}m</p>
              <p className="text-sm text-muted-foreground">Tiempo de Estudio</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{typeof stats.current_lesson?.progress_percent === 'number' ? `${stats.current_lesson.progress_percent}%` : '—'}</p>
              <p className="text-sm text-muted-foreground">Lección actual</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}