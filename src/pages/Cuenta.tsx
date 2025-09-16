import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { User, Mail, Shield, Moon, Sun, Bell, Lock, Monitor, Smartphone, LogOut } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserStats } from '@/hooks/useUserStats';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AvatarUpload } from '@/components/ui/avatar-upload';

export default function Cuenta() {
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { stats } = useUserStats();
  const [name, setName] = useState('');
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    studyReminders: true,
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    setName(profile?.full_name || '');
    setAvatarUrl(profile?.avatar_url || '');
    loadPreferences();
    loadSessions();
  }, [profile?.full_name, profile?.avatar_url]);

  const loadPreferences = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', profile.id)
        .single();
      
      if (error) throw error;
      
      if (data?.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...data.preferences
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
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

  const handlePreferenceChange = async (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    try {
      // Save to user preferences (you can create a user_preferences table)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          preferences: { ...preferences, [key]: value }
        })
        .eq('id', profile?.id);
      
      if (error) throw error;
      
      toast({
        title: 'Preferencia actualizada',
        description: 'Tu configuración fue guardada.'
      });
    } catch (error) {
      console.error('Error saving preference:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la preferencia.',
        variant: 'destructive'
      });
    }
  };

  const handlePasswordChange = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: 'newPassword123' // In real app, get from form
      });
      
      if (error) throw error;
      
      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña fue cambiada exitosamente.'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la contraseña.',
        variant: 'destructive'
      });
    }
  };

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión exitosamente.'
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'teacher': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'student': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Profesor';
      case 'formador': return 'Formador';
      case 'voluntario': return 'Voluntario';
      case 'student': return 'Estudiante';
      default: return 'Estudiante';
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
              onChange={setAvatarUrl}
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

        {/* Configuraciones */}
        <div className="space-y-6">
          {/* Preferencias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-accent" />
                Preferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <Label>Tema {theme === 'dark' ? 'Oscuro' : 'Claro'}</Label>
                </div>
                <Button onClick={toggleTheme} variant="outline" size="sm">
                  Cambiar a {theme === 'dark' ? 'Claro' : 'Oscuro'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificaciones por Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Recibir actualizaciones por correo
                  </p>
                </div>
                <Switch 
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificaciones Push</Label>
                  <p className="text-xs text-muted-foreground">
                    Notificaciones en tiempo real
                  </p>
                </div>
                <Switch 
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Recordatorios de Estudio</Label>
                  <p className="text-xs text-muted-foreground">
                    Recordatorios diarios para estudiar
                  </p>
                </div>
                <Switch 
                  checked={preferences.studyReminders}
                  onCheckedChange={(checked) => handlePreferenceChange('studyReminders', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seguridad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cambiar Contraseña</Label>
                  <p className="text-xs text-muted-foreground">
                    Actualiza tu contraseña por seguridad
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handlePasswordChange}>
                  <Lock className="h-4 w-4 mr-2" />
                  Cambiar
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Autenticación de Dos Factores</Label>
                  <p className="text-xs text-muted-foreground">
                    Añade una capa extra de seguridad
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Shield className="h-4 w-4 mr-2" />
                  Próximamente
                </Button>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sesiones Activas</Label>
                      <p className="text-xs text-muted-foreground">
                        Gestiona tus sesiones abiertas ({sessions.length})
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver Sesiones
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sesiones Activas</DialogTitle>
                    <DialogDescription>
                      Gestiona las sesiones abiertas en tus dispositivos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {session.device.includes('iPhone') || session.device.includes('Android') ? (
                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Monitor className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{session.device}</p>
                            <p className="text-sm text-muted-foreground">{session.location}</p>
                            <p className="text-xs text-muted-foreground">
                              Última actividad: {new Date(session.lastActive).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.current && (
                            <Badge variant="default">Actual</Badge>
                          )}
                          {!session.current && (
                            <Button variant="outline" size="sm">
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-4">
                      <Button variant="destructive" onClick={handleSignOutAll}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Cerrar Todas las Sesiones
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>

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