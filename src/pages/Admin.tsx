import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, BookOpen, GraduationCap, Loader2, Activity, ChevronDown, ChevronUp, TrendingUp, Clock, UserCheck, UserMinus, Eye } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

  // Estados para cards expandibles
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

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
          <p className="text-muted-foreground">Panel de control del Campus</p>
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
        <div className="space-y-4">
          {/* Programas */}
          <Collapsible open={expandedCards['programs']} onOpenChange={() => toggleCard('programs')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Programas</CardTitle>
                        <p className="text-sm text-muted-foreground">{activity.programs.length} programas totales</p>
                      </div>
                    </div>
                    {expandedCards['programs'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.programs.map(program => (
                    <div key={program.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{program.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {program.courses_count} curso{program.courses_count !== 1 ? 's' : ''} • Creado {formatDistanceToNow(new Date(program.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activity.programs.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay programas creados</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Total Usuarios */}
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Total Estudiantes</CardTitle>
                  <p className="text-2xl font-bold">{activity.totalUsers}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Nuevos 30 días */}
          <Collapsible open={expandedCards['new30']} onOpenChange={() => toggleCard('new30')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Nuevos Usuarios (30 días)</CardTitle>
                        <p className="text-sm text-muted-foreground">{activity.newUsers30Days.length} nuevos estudiantes</p>
                      </div>
                    </div>
                    {expandedCards['new30'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.newUsers30Days.map(user => (
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
                      <Badge variant="secondary">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: es })}
                      </Badge>
                    </div>
                  ))}
                  {activity.newUsers30Days.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay nuevos usuarios</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Sin conexión 17 días */}
          <Collapsible open={expandedCards['inactive']} onOpenChange={() => toggleCard('inactive')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow border-orange-200 dark:border-orange-900">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                        <UserMinus className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Sin Progreso (17 días)</CardTitle>
                        <p className="text-sm text-muted-foreground">{activity.inactiveUsers17Days.length} usuarios inactivos</p>
                      </div>
                    </div>
                    {expandedCards['inactive'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.inactiveUsers17Days.slice(0, 20).map(user => (
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
                  {activity.inactiveUsers17Days.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Todos los usuarios están activos</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Usuarios Frecuentes */}
          <Collapsible open={expandedCards['frequent']} onOpenChange={() => toggleCard('frequent')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow border-emerald-200 dark:border-emerald-900">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Usuarios Frecuentes (15 días)</CardTitle>
                        <p className="text-sm text-muted-foreground">{activity.frequentUsers.length} usuarios con 2+ días de actividad</p>
                      </div>
                    </div>
                    {expandedCards['frequent'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.frequentUsers.map(user => (
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
                  {activity.frequentUsers.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay usuarios frecuentes</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Formadores */}
          <Collapsible open={expandedCards['formadores']} onOpenChange={() => toggleCard('formadores')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Formadores</CardTitle>
                        <p className="text-sm text-muted-foreground">{activity.formadores.length} formadores</p>
                      </div>
                    </div>
                    {expandedCards['formadores'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.formadores.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                        <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                          {getInitials(user.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))}
                  {activity.formadores.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay formadores</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Voluntarios */}
          <Collapsible open={expandedCards['voluntarios']} onOpenChange={() => toggleCard('voluntarios')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                      <Users className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Voluntarios</CardTitle>
                      <p className="text-sm text-muted-foreground">{activity.voluntarios.length} voluntarios</p>
                    </div>
                    {expandedCards['voluntarios'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.voluntarios.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                        <AvatarFallback className="bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400">
                          {getInitials(user.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))}
                  {activity.voluntarios.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay voluntarios</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Programas Más Vistos */}
          <Collapsible open={expandedCards['topPrograms']} onOpenChange={() => toggleCard('topPrograms')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Programas Más Vistos</CardTitle>
                        <p className="text-sm text-muted-foreground">Top 5 por minutos vistos</p>
                      </div>
                    </div>
                    {expandedCards['topPrograms'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.topPrograms.map((program, index) => (
                    <div key={program.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{program.title}</p>
                        <p className="text-sm text-muted-foreground">{program.view_minutes.toLocaleString()} minutos vistos</p>
                      </div>
                    </div>
                  ))}
                  {activity.topPrograms.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay datos de visualización</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Cursos Más Vistos */}
          <Collapsible open={expandedCards['topCourses']} onOpenChange={() => toggleCard('topCourses')}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Cursos Más Vistos</CardTitle>
                        <p className="text-sm text-muted-foreground">Top 5 por minutos vistos</p>
                      </div>
                    </div>
                    {expandedCards['topCourses'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {activity.topCourses.map((course, index) => (
                    <div key={course.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center font-bold text-cyan-600 dark:text-cyan-400">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">{course.view_minutes.toLocaleString()} minutos vistos</p>
                      </div>
                    </div>
                  ))}
                  {activity.topCourses.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay datos de visualización</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}

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
