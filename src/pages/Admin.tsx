import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, BookOpen, GraduationCap, Loader2, UserCheck, UserMinus, Eye, TrendingUp } from 'lucide-react';
import { CreateProgramForm } from '@/components/admin/CreateProgramForm';
import { CreateCourseForm } from '@/components/admin/CreateCourseForm';
import { AddCoursesToProgramDialog } from '@/components/admin/AddCoursesToProgramDialog';
import { ProgramSelectorDialog } from '@/components/admin/ProgramSelectorDialog';
import { useStats } from '@/hooks/useStats';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityData {
  programs: Array<{ id: string; title: string; created_at: string; courses_count: number }>;
  totalUsers: number;
  newUsers30Days: Array<{ id: string; full_name: string; avatar_url: string | null; created_at: string; email: string }>;
  inactiveUsers17Days: Array<{ id: string; full_name: string; avatar_url: string | null; last_activity: string | null; email: string }>;
  frequentUsers: Array<{ id: string; full_name: string; avatar_url: string | null; activity_count: number; email: string }>;
  formadores: Array<{ id: string; full_name: string; avatar_url: string | null; created_at: string; email: string }>;
  voluntarios: Array<{ id: string; full_name: string; avatar_url: string | null; created_at: string; email: string }>;
  topPrograms: Array<{ id: string; title: string; view_minutes: number }>;
  topCourses: Array<{ id: string; title: string; view_minutes: number }>;
}

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showAddCourses, setShowAddCourses] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const { stats, loading, refetch } = useStats();
  const [activityLoading, setActivityLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityData>({
    programs: [],
    totalUsers: 0,
    newUsers30Days: [],
    inactiveUsers17Days: [],
    frequentUsers: [],
    formadores: [],
    voluntarios: [],
    topPrograms: [],
    topCourses: [],
  });

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogData, setDialogData] = useState<any[]>([]);
  const [dialogType, setDialogType] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Guard: solo admin o formador pueden acceder
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAllowed = profile && (profile.role === 'admin' || profile.role === 'formador');
  if (!isAllowed) {
    return <Navigate to="/mi-formacion" replace />;
  }

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    try {
      setActivityLoading(true);

      // 1. Programas con conteo de cursos
      const { data: programsData } = await supabase
        .from('programs')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });

      const programsWithCourses = await Promise.all(
        (programsData || []).map(async (prog) => {
          const { count } = await supabase
            .from('program_courses')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', prog.id);
          return { ...prog, courses_count: count || 0 };
        })
      );

      // 2. Total usuarios (solo estudiantes)
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // 3. Nuevos usuarios últimos 30 días
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: newUsers } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, email')
        .eq('role', 'student')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      // 4. Usuarios sin conexión 17 días (sin progreso)
      const seventeenDaysAgo = new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString();
      const { data: allStudents } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('role', 'student');

      // Obtener última actividad de cada estudiante
      const inactiveUsers = await Promise.all(
        (allStudents || []).map(async (student) => {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('updated_at')
            .eq('user_id', student.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          const lastActivity = progress?.[0]?.updated_at || null;

          // Si no tiene actividad O la última actividad fue hace más de 17 días
          if (!lastActivity || new Date(lastActivity) < new Date(seventeenDaysAgo)) {
            return { ...student, last_activity: lastActivity };
          }
          return null;
        })
      );

      const filteredInactive = inactiveUsers.filter(u => u !== null) as any[];

      // 5. Usuarios frecuentes (activos al menos 2 días en últimos 15 días)
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, updated_at')
        .gte('updated_at', fifteenDaysAgo);

      // Agrupar por usuario y contar días únicos de actividad
      const activityByUser: Record<string, Set<string>> = {};
      (recentProgress || []).forEach(prog => {
        const userId = prog.user_id;
        const day = new Date(prog.updated_at).toISOString().split('T')[0];
        if (!activityByUser[userId]) {
          activityByUser[userId] = new Set();
        }
        activityByUser[userId].add(day);
      });

      // Filtrar usuarios con 2 o más días de actividad
      const frequentUserIds = Object.entries(activityByUser)
        .filter(([_, days]) => days.size >= 2)
        .map(([userId]) => userId);

      let frequentUsersData: any[] = [];
      if (frequentUserIds.length > 0) {
        const { data: frequentUsers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', frequentUserIds);

        frequentUsersData = (frequentUsers || []).map(user => ({
          ...user,
          activity_count: activityByUser[user.id].size,
        })).sort((a, b) => b.activity_count - a.activity_count);
      }

      // 6. Formadores
      const { data: formadores } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, email')
        .eq('role', 'formador')
        .order('created_at', { ascending: false });

      // 7. Voluntarios
      const { data: voluntarios } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, email')
        .eq('role', 'voluntario' as any)
        .order('created_at', { ascending: false });

      // 8. Programas más vistos (por minutos de lecciones vistas)
      const { data: allProgress } = await supabase
        .from('lesson_progress')
        .select('watched_seconds, lessons!inner(course_id, courses!inner(program_courses!inner(program_id, programs!inner(title))))');

      const minutesByProgram: Record<string, { title: string; minutes: number }> = {};
      (allProgress || []).forEach((prog: any) => {
        const programId = prog.lessons?.courses?.program_courses?.[0]?.program_id;
        const programTitle = prog.lessons?.courses?.program_courses?.[0]?.programs?.title;
        if (!programId || !programTitle) return;

        if (!minutesByProgram[programId]) {
          minutesByProgram[programId] = { title: programTitle, minutes: 0 };
        }
        minutesByProgram[programId].minutes += Math.floor((prog.watched_seconds || 0) / 60);
      });

      const topPrograms = Object.entries(minutesByProgram)
        .map(([id, data]) => ({ id, title: data.title, view_minutes: data.minutes }))
        .sort((a, b) => b.view_minutes - a.view_minutes)
        .slice(0, 5);

      // 9. Cursos más vistos
      const minutesByCourse: Record<string, { title: string; minutes: number }> = {};
      (allProgress || []).forEach((prog: any) => {
        const courseId = prog.lessons?.course_id;
        const courseTitle = prog.lessons?.courses?.title;
        if (!courseId || !courseTitle) return;

        if (!minutesByCourse[courseId]) {
          minutesByCourse[courseId] = { title: courseTitle, minutes: 0 };
        }
        minutesByCourse[courseId].minutes += Math.floor((prog.watched_seconds || 0) / 60);
      });

      const topCourses = Object.entries(minutesByCourse)
        .map(([id, data]) => ({ id, title: data.title, view_minutes: data.minutes }))
        .sort((a, b) => b.view_minutes - a.view_minutes)
        .slice(0, 5);

      setActivity({
        programs: programsWithCourses,
        totalUsers: totalStudents || 0,
        newUsers30Days: newUsers || [],
        inactiveUsers17Days: filteredInactive,
        frequentUsers: frequentUsersData,
        formadores: formadores || [],
        voluntarios: voluntarios || [],
        topPrograms,
        topCourses,
      });
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const openDialog = (title: string, data: any[], type: string) => {
    setDialogTitle(title);
    setDialogData(data);
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleCreateProgram = () => {
    setShowCreateProgram(true);
  };

  const handleCreateCourse = () => {
    setShowCreateCourse(true);
  };

  const handleSuccess = () => {
    refetch();
    fetchActivityData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Actividad</h1>
          <p className="text-muted-foreground mt-1">Panel de control del Campus</p>
        </div>
        <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}>
          <Button onClick={handleCreateProgram} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Programa
          </Button>
          <Button onClick={handleCreateCourse} className="gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            Nuevo Curso
          </Button>
          <Button
            onClick={() => {
              if (stats.totalPrograms > 0) {
                setShowProgramSelector(true);
              }
            }}
            className="gap-2"
            variant="outline"
            disabled={stats.totalPrograms === 0}
          >
            <BookOpen className="h-4 w-4" />
            Asignar Cursos
          </Button>
        </div>
      </div>

      {activityLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Programas */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Programas', activity.programs, 'programs')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Programas</CardTitle>
                  <p className="text-2xl font-bold">{activity.programs.length}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Total Usuarios */}
          <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Estudiantes</CardTitle>
                  <p className="text-2xl font-bold">{activity.totalUsers}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Nuevos 30 días */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Nuevos Usuarios (30 días)', activity.newUsers30Days, 'users')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Nuevos (30d)</CardTitle>
                  <p className="text-2xl font-bold">{activity.newUsers30Days.length}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Sin progreso 17 días */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Sin Progreso (17 días)', activity.inactiveUsers17Days, 'inactive')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                  <UserMinus className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Inactivos (17d)</CardTitle>
                  <p className="text-2xl font-bold">{activity.inactiveUsers17Days.length}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Usuarios Frecuentes */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Usuarios Frecuentes (15 días)', activity.frequentUsers, 'frequent')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Frecuentes (15d)</CardTitle>
                  <p className="text-2xl font-bold">{activity.frequentUsers.length}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Formadores */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Formadores', activity.formadores, 'users')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Formadores</CardTitle>
                  <p className="text-2xl font-bold">{activity.formadores.length}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Voluntarios */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Voluntarios', activity.voluntarios, 'users')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Voluntarios</CardTitle>
                  <p className="text-2xl font-bold">{activity.voluntarios.length}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Programas Más Vistos */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Programas Más Vistos', activity.topPrograms, 'topPrograms')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                  <Eye className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Top Programas</CardTitle>
                  <p className="text-sm text-muted-foreground">Por minutos</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Cursos Más Vistos */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            onClick={() => openDialog('Cursos Más Vistos', activity.topCourses, 'topCourses')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center flex-shrink-0">
                  <Eye className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Top Cursos</CardTitle>
                  <p className="text-sm text-muted-foreground">Por minutos</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialogType === 'programs' && dialogData.map((program: any) => (
              <div key={program.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <p className="font-medium">{program.title}</p>
                <p className="text-sm text-muted-foreground">
                  {program.courses_count} curso{program.courses_count !== 1 ? 's' : ''} • Creado {formatDistanceToNow(new Date(program.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
            ))}

            {dialogType === 'users' && dialogData.map((user: any) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                {user.created_at && (
                  <Badge variant="secondary">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: es })}
                  </Badge>
                )}
              </div>
            ))}

            {dialogType === 'inactive' && dialogData.map((user: any) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                  <AvatarFallback className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400">
                    {getInitials(user.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {user.last_activity
                    ? `Última: ${formatDistanceToNow(new Date(user.last_activity), { addSuffix: true, locale: es })}`
                    : 'Sin actividad'}
                </Badge>
              </div>
            ))}

            {dialogType === 'frequent' && dialogData.map((user: any) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                    {getInitials(user.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                  {user.activity_count} días activos
                </Badge>
              </div>
            ))}

            {(dialogType === 'topPrograms' || dialogType === 'topCourses') && dialogData.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.view_minutes.toLocaleString()} minutos</p>
                </div>
              </div>
            ))}

            {dialogData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay datos disponibles</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <CreateProgramForm
        open={showCreateProgram}
        onOpenChange={setShowCreateProgram}
        onSuccess={handleSuccess}
      />
      <CreateCourseForm
        open={showCreateCourse}
        onOpenChange={setShowCreateCourse}
        onSuccess={handleSuccess}
      />
      <ProgramSelectorDialog
        open={showProgramSelector}
        onOpenChange={setShowProgramSelector}
        onProgramSelected={(programId) => {
          setSelectedProgramId(programId);
          setShowAddCourses(true);
        }}
      />
      {selectedProgramId && (
        <AddCoursesToProgramDialog
          open={showAddCourses}
          onOpenChange={setShowAddCourses}
          programId={selectedProgramId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
