import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BookOpen, GraduationCap, Clock, CheckCircle, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string | null;
}

interface UserProgram {
  id: string;
  title: string;
  progress_percent: number;
  enrolled_at: string;
  courses_count: number;
  completed_courses: number;
}

interface UserIndividualCourse {
  id: string;
  title: string;
  progress_percent: number;
  enrolled_at: string;
}

interface UserStats {
  total_programs: number;
  active_programs: number;
  completed_lessons: number;
  total_study_time: number;
  total_individual_courses: number;
  current_lesson?: {
    title: string;
    course_title: string;
  };
}

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function UserProfileDialog({ open, onOpenChange, userId }: UserProfileDialogProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [programs, setPrograms] = useState<UserProgram[]>([]);
  const [individualCourses, setIndividualCourses] = useState<UserIndividualCourse[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignCourses, setAssignCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [assignLessons, setAssignLessons] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  useEffect(() => {
    console.log('UserProfileDialog useEffect:', { open, userId });
    if (open && userId) {
      console.log('Fetching user data for:', userId);
      fetchUserData();
    }
  }, [open, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // We'll accumulate results locally to compute consistent stats
      let localPrograms: UserProgram[] = [];
      let localIndividualCourses: UserIndividualCourse[] = [];

      // Fetch user profile (with graceful fallback if RPC not available)
      let loadedProfile: any = null;
      try {
        const { data: profileData } = await supabase
          .rpc('get_users_with_emails')
          .eq('id', userId)
          .single();
        loadedProfile = profileData || null;
      } catch {}

      if (!loadedProfile) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, full_name, role, created_at')
          .eq('id', userId)
          .maybeSingle();
        if (p) {
          loadedProfile = { ...p, email: '—' };
        }
      }

      if (loadedProfile) {
        setProfile({
          id: loadedProfile.id,
          full_name: loadedProfile.full_name,
          email: loadedProfile.email || '—',
          role: loadedProfile.role,
          created_at: loadedProfile.created_at,
          last_sign_in_at: loadedProfile.last_sign_in_at || loadedProfile.last_signin_at || null
        });
      }

      // Fetch user enrollments and program progress (program bundles)
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          program_id,
          created_at,
          programs!inner (
            id,
            title,
            id
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
      // Batch load courses per program and compute progress via lesson_progress
      let programCoursesByProgram: Record<string, Array<{ id: string; title: string }>> = {};
      const allCourseIdsSet = new Set<string>();
      if (enrollments && enrollments.length > 0) {
        const programIds = enrollments.map((e: any) => e.program_id).filter(Boolean);
        if (programIds.length > 0) {
          const { data: programCourses } = await supabase
            .from('program_courses')
            .select('program_id, courses (id, title)')
            .in('program_id', programIds)
            .order('sort_order');
          (programCourses || []).forEach((row: any) => {
            const c = row.courses;
            if (!c) return;
            if (!programCoursesByProgram[row.program_id]) programCoursesByProgram[row.program_id] = [];
            programCoursesByProgram[row.program_id].push({ id: c.id, title: c.title });
            allCourseIdsSet.add(c.id);
          });
        }
      }

      // Fetch individual course enrollments
      const { data: courseEnrs } = await supabase
        .from('course_enrollments')
        .select('course_id, created_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (courseEnrs && courseEnrs.length > 0) {
        const courseIds = Array.from(new Set(courseEnrs.map((ce: any) => ce.course_id).filter(Boolean)));
        let coursesMap: Record<string, { id: string; title: string }> = {};
        if (courseIds.length > 0) {
          const { data: courseRows } = await supabase
            .from('courses')
            .select('id, title')
            .in('id', courseIds);
          (courseRows || []).forEach((row) => { coursesMap[row.id] = { id: row.id, title: row.title }; });
          courseIds.forEach(id => allCourseIdsSet.add(id));
        }

        localIndividualCourses = (courseEnrs || []).map((ce: any) => {
          const c = coursesMap[ce.course_id];
          if (!c) return null;
          return {
            id: c.id,
            title: c.title,
            progress_percent: 0,
            enrolled_at: ce.created_at,
          } as UserIndividualCourse;
        }).filter(Boolean) as UserIndividualCourse[];
      } else {
        localIndividualCourses = [];
      }

      // Compute course progress in batch using lessons and lesson_progress
      const allCourseIds = Array.from(allCourseIdsSet);
      let courseTotalLessons: Record<string, number> = {};
      let lessonToCourse: Record<string, string> = {};
      if (allCourseIds.length > 0) {
        const { data: lessonRows } = await supabase
          .from('lessons')
          .select('id, course_id')
          .in('course_id', allCourseIds);
        (lessonRows || []).forEach((row: any) => {
          lessonToCourse[row.id] = row.course_id;
          courseTotalLessons[row.course_id] = (courseTotalLessons[row.course_id] || 0) + 1;
        });

        const lessonIds = Object.keys(lessonToCourse);
        let courseCompletedLessons: Record<string, number> = {};
        if (lessonIds.length > 0) {
          const { data: lps } = await supabase
            .from('lesson_progress')
            .select('lesson_id, completed')
            .eq('user_id', userId)
            .in('lesson_id', lessonIds);
          (lps || []).forEach((lp: any) => {
            if (lp.completed) {
              const cid = lessonToCourse[lp.lesson_id];
              if (cid) courseCompletedLessons[cid] = (courseCompletedLessons[cid] || 0) + 1;
            }
          });

          const courseProgress: Record<string, number> = {};
          Object.keys(courseTotalLessons).forEach((cid) => {
            const total = courseTotalLessons[cid] || 0;
            const completed = courseCompletedLessons[cid] || 0;
            courseProgress[cid] = total > 0 ? Math.round((completed / total) * 100) : 0;
          });

          // Map programs with averaged progress
          if (enrollments) {
            const userPrograms = enrollments.map((enrollment: any) => {
              const program = enrollment.programs;
              const courseList = (programCoursesByProgram[enrollment.program_id] || []);
              const coursesCount = courseList.length;
              let totalProgress = 0;
              let completedCourses = 0;
              courseList.forEach((c) => {
                const p = courseProgress[c.id] || 0;
                totalProgress += p;
                if (p === 100) completedCourses += 1;
              });
              const avgProgress = coursesCount > 0 ? Math.round(totalProgress / coursesCount) : 0;
              return {
                id: program.id,
                title: program.title,
                progress_percent: avgProgress,
                enrolled_at: enrollment.created_at,
                courses_count: coursesCount,
                completed_courses: completedCourses
              } as UserProgram;
            });
            localPrograms = userPrograms;
            setPrograms(userPrograms);
          }

          // Fill individual course percents
          localIndividualCourses = localIndividualCourses.map((c) => ({
            ...c,
            progress_percent: courseProgress[c.id] || 0
          }));
          setIndividualCourses(localIndividualCourses);
        } else {
          // No lessons
          if (enrollments) {
            const userPrograms = enrollments.map((enrollment: any) => ({
              id: enrollment.programs.id,
              title: enrollment.programs.title,
              progress_percent: 0,
              enrolled_at: enrollment.created_at,
              courses_count: (programCoursesByProgram[enrollment.program_id] || []).length,
              completed_courses: 0
            }));
            localPrograms = userPrograms;
            setPrograms(userPrograms);
          }
          setIndividualCourses(localIndividualCourses);
        }
      } else {
        // No courses at all
        localPrograms = [];
        setPrograms([]);
        setIndividualCourses([]);
      }

      // Fetch user stats
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select(`
          completed,
          watched_seconds,
          lessons!inner (
            title,
            duration_minutes,
            courses!inner (title)
          )
        `)
        .eq('user_id', userId);

      if (progressData) {
        const completedLessons = progressData.filter(p => p.completed).length;
        const totalStudyTime = progressData.reduce((acc, p) => {
          return acc + (p.watched_seconds || 0);
        }, 0);

        const currentLesson = progressData.find(p => !p.completed);
        
        setStats({
          total_programs: localPrograms.length,
          active_programs: localPrograms.filter(p => p.progress_percent < 100).length,
          completed_lessons: completedLessons,
          total_study_time: Math.round(totalStudyTime / 60), // Convert to minutes
          total_individual_courses: localIndividualCourses.length,
          current_lesson: currentLesson ? {
            title: currentLesson.lessons.title,
            course_title: currentLesson.lessons.courses.title
          } : undefined
        });
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carga cursos inscritos del usuario para asignar progreso
  const loadAssignData = async () => {
    if (!userId) return;
    setAssignLoading(true);
    try {
      const coursesMap: Record<string, { id: string; title: string }> = {};
      // Programas -> cursos
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('program_id, programs!inner(id)')
        .eq('user_id', userId)
        .eq('status', 'active');
      const programIds = (enrollments || []).map((e: any) => e.program_id).filter(Boolean);
      if (programIds.length > 0) {
        const { data: pc } = await supabase
          .from('program_courses')
          .select('courses (id, title), program_id')
          .in('program_id', programIds);
        (pc || []).forEach((row: any) => {
          if (row.courses) coursesMap[row.courses.id] = { id: row.courses.id, title: row.courses.title };
        });
      }
      // Cursos individuales
      const { data: ce } = await supabase
        .from('course_enrollments')
        .select('courses (id, title)')
        .eq('user_id', userId)
        .eq('status', 'active');
      (ce || []).forEach((row: any) => {
        if (row.courses) coursesMap[row.courses.id] = { id: row.courses.id, title: row.courses.title };
      });

      const list = Object.values(coursesMap).sort((a, b) => a.title.localeCompare(b.title));
      setAssignCourses(list);
      setAssignLessons([]);
      setSelectedCourseId('');
      setSelectedLessonId('');
    } finally {
      setAssignLoading(false);
    }
  };

  const onCourseChange = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId('');
    if (!courseId) { setAssignLessons([]); return; }
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('course_id', courseId)
      .order('sort_order');
    setAssignLessons((lessons || []).map((l: any) => ({ id: l.id, title: l.title })));
  };

  const markLessonCompleted = async () => {
    if (!userId || !selectedLessonId) return;
    setAssignLoading(true);
    try {
      await fetch('https://epqalebkqmkddlfomnyf.functions.supabase.co/assign-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'mark_lesson', lesson_id: selectedLessonId })
      });
      await fetchUserData();
      setAssignOpen(false);
    } finally {
      setAssignLoading(false);
    }
  };

  const markCourseCompleted = async () => {
    if (!userId || !selectedCourseId) return;
    setAssignLoading(true);
    try {
      await fetch('https://epqalebkqmkddlfomnyf.functions.supabase.co/assign-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'mark_course', course_id: selectedCourseId })
      });
      await fetchUserData();
      setAssignOpen(false);
    } finally {
      setAssignLoading(false);
    }
  };

  const resetCourseProgress = async () => {
    if (!userId || !selectedCourseId) return;
    setAssignLoading(true);
    try {
      await fetch('https://epqalebkqmkddlfomnyf.functions.supabase.co/assign-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'reset_course', course_id: selectedCourseId })
      });
      await fetchUserData();
    } finally {
      setAssignLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'formador': return 'Formador';
      case 'voluntario': return 'Voluntario';
      case 'admin': return 'Administrador';
      default: return 'Estudiante';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  console.log('UserProfileDialog render:', { open, userId, profile });
  
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil de Usuario
          </DialogTitle>
          <DialogDescription>Información completa del estudiante seleccionado.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setAssignOpen(true); loadAssignData(); }}
          >
            Asignar progreso
          </Button>
        </div>

        {profile && (
          <div className="space-y-6">
            {/* User Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                      {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">{profile.full_name}</h3>
                    <p className="text-muted-foreground">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{getRoleLabel(profile.role)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Miembro desde {formatDate(profile.created_at)}
                      </span>
                      {profile.last_sign_in_at && (
                        <span className="text-sm text-muted-foreground">
                          • Último acceso {formatDate(profile.last_sign_in_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            {stats && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Programas</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.total_programs}</p>
                    <p className="text-xs text-muted-foreground">Inscritos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Lecciones</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.completed_lessons}</p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Tiempo</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.total_study_time}</p>
                    <p className="text-xs text-muted-foreground">Minutos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Activos</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.active_programs}</p>
                    <p className="text-xs text-muted-foreground">Programas</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Current Lesson */}
            {stats?.current_lesson && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Lección Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{stats.current_lesson.title}</p>
                  <p className="text-sm text-muted-foreground">{stats.current_lesson.course_title}</p>
                </CardContent>
              </Card>
            )}

            {/* Programs */}
            <Card>
              <CardHeader>
                <CardTitle>Programas Inscritos</CardTitle>
              </CardHeader>
              <CardContent>
                {programs.length === 0 ? (
                  <p className="text-muted-foreground">No está inscrito en ningún programa</p>
                ) : (
                  <div className="space-y-4">
                    {programs.map(program => (
                      <div key={program.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{program.title}</h4>
                          <Badge variant="outline">
                            {program.completed_courses}/{program.courses_count} cursos
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progreso</span>
                            <span>{program.progress_percent}%</span>
                          </div>
                          <Progress value={program.progress_percent} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            Inscrito el {formatDate(program.enrolled_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Individual Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Cursos Individuales</CardTitle>
              </CardHeader>
              <CardContent>
                {individualCourses.length === 0 ? (
                  <p className="text-muted-foreground">No está inscrito en cursos individuales</p>
                ) : (
                  <div className="space-y-3">
                    {individualCourses.map((c) => (
                      <div key={c.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{c.title}</h4>
                          <Badge variant="outline">{c.progress_percent}%</Badge>
                        </div>
                        <Progress value={c.progress_percent} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">Inscrito el {formatDate(c.enrolled_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Asignar Progreso */}
    <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Asignar progreso manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Curso</label>
            <Select value={selectedCourseId} onValueChange={onCourseChange}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Elegir curso" />
              </SelectTrigger>
              <SelectContent>
                {assignCourses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Lección (opcional)</label>
            <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Elegir lección" />
              </SelectTrigger>
              <SelectContent>
                {assignLessons.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button disabled={!selectedCourseId || assignLoading} onClick={markCourseCompleted} className="flex-1">Marcar curso completado</Button>
            <Button disabled={!selectedLessonId || assignLoading} variant="secondary" onClick={markLessonCompleted} className="flex-1">Marcar lección</Button>
            <Button disabled={!selectedCourseId || assignLoading} variant="destructive" onClick={resetCourseProgress}>Reset curso</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}