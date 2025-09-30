import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Users, BookOpen, GraduationCap, Settings, CheckCircle, Clock, Star, TrendingUp, Loader2, Activity } from 'lucide-react';
import { CreateProgramForm } from '@/components/admin/CreateProgramForm';
import { CreateCourseForm } from '@/components/admin/CreateCourseForm';
import { UserProfileDialog } from '@/components/admin/UserProfileDialog';
import { AddCoursesToProgramDialog } from '@/components/admin/AddCoursesToProgramDialog';
import { ProgramSelectorDialog } from '@/components/admin/ProgramSelectorDialog';
import { useStats } from '@/hooks/useStats';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showAddCourses, setShowAddCourses] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const { stats, loading, refetch } = useStats();

  // Actividad/Estadísticas avanzadas
  const [activityLoading, setActivityLoading] = useState(true);
  const [activity, setActivity] = useState({
    programs: 0,
    courses: 0,
    usersInPrograms: 0,
    usersInIndividual: 0,
    newWeek: 0,
    newMonth: 0,
    newYear: 0,
    active30: 0,
    active7: 0,
    totalStudents: 0,
    totalActiveStudentsMonth: 0,
    totalTeachers: 0,
    totalVolunteers: 0,
    topCourses: [] as Array<{ courseId: string; title: string; minutes: number }>,
    topCourseTitle: '' as string,
    topCourseMinutes: 0 as number,
    topProgramTitle: '' as string,
    topProgramMinutes: 0 as number,
    activeUsersList: [] as Array<{ id: string; full_name?: string; name?: string }>,
    activeUsers20List: [] as Array<{ id: string; full_name?: string; name?: string }>,
  });
  // Rango de fechas (actividad)
  const todayStr = new Date().toISOString().slice(0,10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);
  const [rangeStart, setRangeStart] = useState(thirtyDaysAgoStr);
  const [rangeEnd, setRangeEnd] = useState(todayStr);

  // Dialog Perfil desde chips de activos
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersDetails, setActiveUsersDetails] = useState<Array<{ id: string; name: string; full_name: string; email: string; role: string; programs: string[]; courses: string[] }>>([]);
  const [activeUsersSearch, setActiveUsersSearch] = useState('');
  const [activityDialogTitle, setActivityDialogTitle] = useState('Usuarios');
  const [activeUsersRoleFilter, setActiveUsersRoleFilter] = useState<'todos' | 'student' | 'teacher' | 'admin' | 'voluntario'>('todos');

  const exportActiveUsersCsv = () => {
    const headers = ['nombre','email','programas','cursos'];
    const search = activeUsersSearch.trim().toLowerCase();
    const rows = activeUsersDetails
      .filter(u => !search || (u.full_name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search) || u.programs.join(', ').toLowerCase().includes(search) || u.courses.join(', ').toLowerCase().includes(search)))
      .map(u => ({
        nombre: u.full_name || '',
        email: u.email || '',
        programas: u.programs.join(' | '),
        cursos: u.courses.join(' | '),
      }));
    const lines = [headers.join(',')].concat(
      rows.map(r => headers.map(h => `"${String((r as any)[h] ?? '').replace(/"/g,'""')}"`).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url; a.download = `usuarios-activos-${date}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const openActivityDialog = async (kind: string, title: string) => {
    try {
      setActiveUsersLoading(true);
      setShowActiveUsers(true);
      setActivityDialogTitle(title);

      let ids: string[] = [];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

      if (kind === 'active30') {
        const { data } = await supabase.from('lesson_progress').select('user_id').gte('updated_at', monthAgo).limit(10000);
        ids = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
      } else if (kind === 'active7') {
        const { data } = await supabase.from('lesson_progress').select('user_id').gte('updated_at', weekAgo).limit(10000);
        ids = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
      } else if (kind === 'usersInPrograms' || kind === 'programs') {
        const { data } = await supabase.from('course_enrollments').select('user_id').eq('status', 'active').limit(20000);
        ids = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
      } else if (kind === 'usersInIndividual' || kind === 'courses') {
        const { data } = await supabase.from('assignments').select('user_id').limit(20000);
        ids = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
      } else if (kind === 'newWeek') {
        const { data } = await supabase.from('profiles').select('id').gte('created_at', weekAgo).limit(20000);
        ids = (data || []).map((r: any) => r.id);
      } else if (kind === 'newMonth') {
        const { data } = await supabase.from('profiles').select('id').gte('created_at', monthAgo).limit(20000);
        ids = (data || []).map((r: any) => r.id);
      } else if (kind === 'newYear') {
        const { data } = await supabase.from('profiles').select('id').gte('created_at', yearAgo).limit(20000);
        ids = (data || []).map((r: any) => r.id);
      } else if (kind === 'totalStudents') {
        const { data } = await supabase.from('profiles').select('id').eq('role', 'student').limit(20000);
        ids = (data || []).map((r: any) => r.id);
      } else if (kind === 'totalTeachers') {
        const { data } = await supabase.from('profiles').select('id').eq('role', 'teacher').limit(20000);
        ids = (data || []).map((r: any) => r.id);
      } else if (kind === 'totalVolunteers') {
        const { data } = await supabase.from('profiles').select('id').eq('role', 'student').limit(20000);
        ids = (data || []).map((r: any) => r.id);
      } else if (kind === 'activeStudentsMonth') {
        const { data: lp } = await supabase.from('lesson_progress').select('user_id').gte('updated_at', monthAgo).limit(20000);
        const setIds = new Set((lp || []).map((r: any) => r.user_id).filter(Boolean));
        const { data: studs } = await supabase.from('profiles').select('id').eq('role', 'student').in('id', Array.from(setIds));
        ids = (studs || []).map((r: any) => r.id);
      }

      if (ids.length === 0) { setActiveUsersDetails([]); return; }

      // Obtener emails y roles vía Edge Function list-users (más robusto que la RPC)
      let byId: Record<string, any> = {};
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users?all=true&pageSize=2000&sortBy=created_at&sortDir=desc`, {
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        });
        const json = await resp.json();
        const arr = (json?.data?.users || []) as any[];
        arr.forEach((u: any) => { byId[u.id] = u; });
      } catch (_) {
        byId = {};
      }

      // Programas y cursos asociados
      const [{ data: enr }, { data: cenr }] = await Promise.all([
        supabase.from('course_enrollments').select('user_id, courses(title)').in('user_id', ids),
        supabase.from('assignments').select('user_id, courses(title)').in('user_id', ids),
      ]);
      const programsByUser: Record<string, string[]> = {};
      (enr || []).forEach((row: any) => {
        const uid = row.user_id; const title = row.programs?.title;
        if (!uid || !title) return; if (!programsByUser[uid]) programsByUser[uid] = []; programsByUser[uid].push(title);
      });
      const coursesByUser: Record<string, string[]> = {};
      (cenr || []).forEach((row: any) => {
        const uid = row.user_id; const title = row.courses?.title;
        if (!uid || !title) return; if (!coursesByUser[uid]) coursesByUser[uid] = []; coursesByUser[uid].push(title);
      });

      const details = ids.map((id) => ({
        id,
        name: byId[id]?.full_name || byId[id]?.email || '—',
        full_name: byId[id]?.full_name || byId[id]?.email || '—',
        email: byId[id]?.email || '—',
        role: byId[id]?.role || 'student',
        programs: (programsByUser[id] || []).slice(0, 5),
        courses: (coursesByUser[id] || []).slice(0, 5),
      }));
      setActiveUsersDetails(details);
    } finally {
      setActiveUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity(rangeStart, rangeEnd);
  }, []);

  const fetchActivity = async (start?: string, end?: string) => {
    try {
      setActivityLoading(true);
      // Intentar vía Edge Function unificada (read-only). Si falla, usar fallback local
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activity?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        });
        
        // Verificar que la respuesta sea OK
        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }
        
        // Verificar que sea JSON
        const contentType = resp.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('La respuesta no es JSON');
        }
        
        const json = await resp.json();
        if (json?.success && json?.data) {
          setActivity(prev => ({ ...prev, ...json.data }));
          return;
        }
      } catch (e) {
        console.warn('Edge activity fallback:', e);
      }
      // Programs count
      const { count: progCount } = await supabase.from('programs').select('*', { count: 'exact', head: true });
      const { count: courseCount } = await supabase.from('courses').select('*', { count: 'exact', head: true });

      // Distinct users in programs (active)
      const { data: enrs } = await supabase.from('course_enrollments').select('user_id').eq('status', 'active');
      const usersInPrograms = new Set((enrs || []).map((e: any) => e.user_id)).size;

      // Distinct users in individual courses (active) - Only count if courses exist
      let usersInIndividual = 0;
      if (courseCount && courseCount > 0) {
      const { data: cenrs } = await supabase.from('course_enrollments').select('user_id').eq('status', 'active');
        usersInIndividual = new Set((cenrs || []).map((e: any) => e.user_id)).size;
      }

      // New users by period from profiles.created_at
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

      const { data: pWeek } = await supabase.from('profiles').select('id, created_at').gte('created_at', weekAgo);
      const { data: pMonth } = await supabase.from('profiles').select('id, created_at').gte('created_at', monthAgo);
      const { data: pYear } = await supabase.from('profiles').select('id, created_at').gte('created_at', yearAgo);

      // Totales por rol
      const { count: totalStudents } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
      const { count: totalTeachers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
      const { count: totalVolunteers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');

      // Top courses by watched_minutes (lesson_progress joined to lessons->courses)
      // limitar por rango si está definido
      let lpSelect = supabase
        .from('lesson_progress')
        .select('watched_seconds, updated_at, lessons!inner(course_id, courses!inner(title))')
        .limit(10000) as any;
      if (start && end) {
        const startIso = new Date(start).toISOString();
        const endIso = new Date(new Date(end).getTime() + 24*60*60*1000).toISOString();
        lpSelect = lpSelect.gte('updated_at', startIso).lt('updated_at', endIso);
      }
      const { data: lps } = await lpSelect;
      const minutesByCourse: Record<string, { title: string; minutes: number }> = {};
      (lps || []).forEach((row: any) => {
        const cid = row.lessons?.course_id;
        const title = row.lessons?.courses?.title || 'Curso';
        if (!cid) return;
        if (!minutesByCourse[cid]) minutesByCourse[cid] = { title, minutes: 0 };
        minutesByCourse[cid].minutes += Math.floor((row.watched_seconds || 0) / 60);
      });
      const topCourses = Object.entries(minutesByCourse)
        .map(([courseId, v]) => ({ courseId, title: v.title, minutes: v.minutes }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 5);

      // Calcular Top Programa a partir de minutos por curso
      let topProgramTitle = '';
      let topProgramMinutes = 0;
      const allCourseIds = Object.keys(minutesByCourse);
      if (allCourseIds.length > 0) {
        const { data: pcMap } = await supabase
          .from('program_courses')
          .select('program_id, course_id, programs(title)')
          .in('course_id', allCourseIds);
        const minutesByProgram: Record<string, { title: string; minutes: number }> = {};
        (pcMap || []).forEach((row: any) => {
          const pid = row.program_id;
          const title = row.programs?.title || 'Programa';
          const courseMin = minutesByCourse[row.course_id]?.minutes || 0;
          if (!minutesByProgram[pid]) minutesByProgram[pid] = { title, minutes: 0 };
          minutesByProgram[pid].minutes += courseMin;
        });
        const topProg = Object.values(minutesByProgram).sort((a, b) => b.minutes - a.minutes)[0];
        if (topProg) { topProgramTitle = topProg.title; topProgramMinutes = topProg.minutes; }
      }

      const topCourseTitle = topCourses[0]?.title || '';
      const topCourseMinutes = topCourses[0]?.minutes || 0;

      // Active users in range (any activity)
      const activeSet = new Set<string>();
      const startIso = new Date(rangeStart).toISOString();
      const endIso = new Date(new Date(rangeEnd).getTime() + 24*60*60*1000).toISOString();
      const { data: lpActive } = await supabase
        .from('lesson_progress')
        .select('user_id, updated_at')
        .gte('updated_at', startIso)
        .lt('updated_at', endIso);
      (lpActive || []).forEach((r: any) => r.user_id && activeSet.add(r.user_id));
      const { data: asgActive } = await supabase
        .from('assignments')
        .select('user_id, created_at')
        .gte('created_at', startIso)
        .lt('created_at', endIso);
      (asgActive || []).forEach((r: any) => r.user_id && activeSet.add(r.user_id));
      // If messages table exists, try read; ignore error if not
      try {
        const { data: msgActive } = await supabase
          .from('messages')
          .select('sender_id, created_at')
          .gte('created_at', startIso)
          .lt('created_at', endIso);
        (msgActive || []).forEach((r: any) => r.sender_id && activeSet.add(r.sender_id));
      } catch {}

      // Active users last 7 days (rolling)
      const weekStartIso = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      const weekActive = new Set<string>();
      const { data: lpW } = await supabase.from('lesson_progress').select('user_id, updated_at').gte('updated_at', weekStartIso);
      (lpW || []).forEach((r: any) => r.user_id && weekActive.add(r.user_id));
      const { data: asgW } = await supabase.from('assignments').select('user_id, created_at').gte('created_at', weekStartIso);
      (asgW || []).forEach((r: any) => r.user_id && weekActive.add(r.user_id));
      try {
        const { data: msgW } = await supabase.from('messages').select('sender_id, created_at').gte('created_at', weekStartIso);
        (msgW || []).forEach((r: any) => r.sender_id && weekActive.add(r.sender_id));
      } catch {}

      setActivity({
        programs: progCount || 0,
        courses: courseCount || 0,
        usersInPrograms,
        usersInIndividual,
        newWeek: (pWeek || []).length,
        newMonth: (pMonth || []).length,
        newYear: (pYear || []).length,
        active30: activeSet.size,
        active7: weekActive.size,
        totalStudents: totalStudents || 0,
        totalActiveStudentsMonth: 0, // placeholder, set below
        totalTeachers: totalTeachers || 0,
        totalVolunteers: totalVolunteers || 0,
        topCourses,
        topCourseTitle,
        topCourseMinutes,
        topProgramTitle,
        topProgramMinutes,
        activeUsersList: [],
        activeUsers20List: [],
      });

      // Calcular estudiantes activos último mes
      const { data: lpMonth } = await supabase
        .from('lesson_progress')
        .select('user_id, updated_at')
        .gte('updated_at', monthAgo);
      const activeMonthSet = new Set<string>((lpMonth || []).map((r: any) => r.user_id).filter(Boolean));
      let activeStudentsMonth = 0;
      if (activeMonthSet.size > 0) {
        const { data: activeStudents } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .in('id', Array.from(activeMonthSet));
        activeStudentsMonth = (activeStudents || []).length;
      }
      // Lista de usuarios activos (30 días) – mostrar hasta 12 nombres
      let activeUsersList: Array<{ id: string; name: string }> = [];
      if (activeSet.size > 0) {
        const { data: actUsers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(activeSet))
          .limit(12);
        activeUsersList = (actUsers || []).map((u: any) => ({ id: u.id, name: u.full_name || '' }));
      }
      setActivity(prev => ({ ...prev, totalActiveStudentsMonth: activeStudentsMonth, activeUsersList }));
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
  };

  const exportCsv = () => {
    const lines: string[] = [];
    const add = (arr: (string | number)[]) => lines.push(arr.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    add(['Métrica', 'Valor']);
    add(['Programas', activity.programs]);
    add(['Usuarios en programas', activity.usersInPrograms]);
    add(['Cursos', activity.courses]);
      add(['Usuarios en programas', activity.usersInIndividual]);
    add(['Nuevos 7 días', activity.newWeek]);
    add(['Nuevos 30 días', activity.newMonth]);
    add(['Nuevos 365 días', activity.newYear]);
    add(['Activos 30 días', activity.active30]);
    lines.push('');
    add(['Top Cursos', 'Minutos']);
    activity.topCourses.forEach(c => add([c.title, c.minutes]));
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url; a.download = `actividad-campus-${date}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Administrador</h1>
          <p className="text-muted-foreground">Gestiona todo el Campus de Geometría Sagrada</p>
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
          <Button className="gap-2" variant="outline" onClick={() => window.open('/cuenta', '_blank')}>
            <Settings className="h-4 w-4" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Actividad (solo admin) */}
      <div>
        <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'} mb-2`}>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Actividad</h2>
          </div>
          <div className={`flex items-center gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <div className={`flex items-center gap-1 text-sm ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <span>Desde</span>
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="bg-transparent border rounded px-2 py-1" />
              <span>Hasta</span>
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="bg-transparent border rounded px-2 py-1" />
              <Button size="sm" variant="outline" onClick={() => fetchActivity(rangeStart, rangeEnd)}>Aplicar</Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} className={isMobile ? 'w-full' : ''}>Exportar CSV</Button>
          </div>
        </div>
        {activityLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
              <Card role="button" onClick={() => openActivityDialog('programs', 'Programas')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Programas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.programs}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('usersInPrograms', 'Usuarios en programas')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Usuarios en programas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.usersInPrograms}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('courses', 'Cursos')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Cursos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.courses}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('usersInIndividual', 'Usuarios en programas')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Usuarios en programas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.usersInIndividual}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('newWeek', 'Nuevos usuarios 7 días')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Nuevos 7 días</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.newWeek}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('newMonth', 'Nuevos usuarios en 30 días')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Nuevos 30 días</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.newMonth}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('active30', 'Usuarios activos 30 días')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Activos 30 días</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.active30}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('active7', 'Usuarios activos esta semana')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Activos 7 días</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.active7}</div>
                </CardContent>
              </Card>
              <Card role="button" onClick={() => openActivityDialog('newYear', 'Nuevos usuarios este año')} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Nuevos este año</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.newYear}</div>
                </CardContent>
              </Card>
            </div>
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-2'} mt-4`}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Más Vistos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-2'} gap-3`}>
                    <div className="p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Programa más visto</div>
                      <div className="font-medium line-clamp-2">{activity.topProgramTitle || '—'}</div>
                      <div className="text-sm text-muted-foreground">{activity.topProgramMinutes} min</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Curso más visto</div>
                      <div className="font-medium line-clamp-2">{activity.topCourseTitle || '—'}</div>
                      <div className="text-sm text-muted-foreground">{activity.topCourseMinutes} min</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card role="button" className="cursor-pointer" onClick={() => openActivityDialog('active30', 'Usuarios activos 30 días')}>
                <CardHeader>
                  <CardTitle className="text-sm">Estudiantes activos (30 días)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-center">{activity.active30}</div>
                </CardContent>
              </Card>
              
            </div>

            {/* Totales por rol - responsive */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'} mt-4`}>
              <Card role="button" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openActivityDialog('totalStudents', 'Total de estudiantes')}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Estudiantes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.totalStudents}</div>
                </CardContent>
              </Card>
              <Card role="button" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openActivityDialog('activeStudentsMonth', 'Estudiantes activos último mes')}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Activos mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.totalActiveStudentsMonth}</div>
                </CardContent>
              </Card>
              <Card role="button" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openActivityDialog('totalTeachers', 'Total de formadores')}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Formadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.totalTeachers}</div>
                </CardContent>
              </Card>
              <Card role="button" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openActivityDialog('totalVolunteers', 'Total de voluntarios')}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Voluntarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{activity.totalVolunteers}</div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Estadísticas básicas: removidas por solicitud */}

      {!loading && stats.totalPrograms === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Comienza creando contenido!</h3>
            <p className="text-muted-foreground mb-6">
              Tu campus está listo. Crea programas y cursos para empezar a gestionar el aprendizaje.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleCreateProgram} className="gap-2">
                <Plus className="h-4 w-4" />
                Mi Primer Programa
              </Button>
            </div>
          </div>
        </div>
      )}

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
      {selectedUserId && (
        <UserProfileDialog
          open={showUserProfile}
          onOpenChange={setShowUserProfile}
          userId={selectedUserId}
        />
      )}
      <Dialog open={showActiveUsers} onOpenChange={setShowActiveUsers}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {activityDialogTitle}
              <span className="text-xs text-muted-foreground ml-2">
                {activeUsersDetails
                  .filter(u => activeUsersRoleFilter === 'todos' || u.role === activeUsersRoleFilter)
                  .filter(u => {
                    const s = activeUsersSearch.trim().toLowerCase();
                    if (!s) return true;
                    return (
                      (u.full_name || '').toLowerCase().includes(s) ||
                      (u.email || '').toLowerCase().includes(s) ||
                      u.programs.join(', ').toLowerCase().includes(s) ||
                      u.courses.join(', ').toLowerCase().includes(s)
                    );
                  }).length} resultados
              </span>
            </DialogTitle>
            <DialogDescription>Nombre, email y asociaciones recientes</DialogDescription>
          </DialogHeader>
          {activeUsersLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar por nombre, email, programa o curso"
                  value={activeUsersSearch}
                  onChange={(e) => setActiveUsersSearch(e.target.value)}
                  disabled
                />
                <Button variant="outline" disabled>Cargando...</Button>
              </div>
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar por nombre, email, programa o curso"
                  value={activeUsersSearch}
                  onChange={(e) => setActiveUsersSearch(e.target.value)}
                />
                <Select value={activeUsersRoleFilter} onValueChange={(v) => setActiveUsersRoleFilter(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="student">Estudiante</SelectItem>
                    <SelectItem value="teacher">Formador</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="voluntario">Voluntario</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportActiveUsersCsv}>Exportar CSV</Button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-auto">
              {activeUsersDetails
                .filter(u => activeUsersRoleFilter === 'todos' || u.role === activeUsersRoleFilter)
                .filter(u => {
                  const s = activeUsersSearch.trim().toLowerCase();
                  if (!s) return true;
                  return (
                    (u.full_name || '').toLowerCase().includes(s) ||
                    (u.email || '').toLowerCase().includes(s) ||
                    u.programs.join(', ').toLowerCase().includes(s) ||
                    u.courses.join(', ').toLowerCase().includes(s)
                  );
                })
                .map(u => (
                <div key={u.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedUserId(u.id); setShowUserProfile(true); }}>
                      Ver perfil
                    </Button>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="text-muted-foreground">Programas: {u.programs.join(', ') || '—'}</div>
                    <div className="text-muted-foreground">Cursos: {u.courses.join(', ') || '—'}</div>
                  </div>
                </div>
              ))}
              {activeUsersDetails.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}