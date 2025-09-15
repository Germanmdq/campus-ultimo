import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const url = new URL(req.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const startIso = start ? new Date(start).toISOString() : null;
    const endIso = end ? new Date(new Date(end).getTime() + 24*60*60*1000).toISOString() : null;

    // Programs & courses counts
    const [{ count: programs }, { count: courses }] = await Promise.all([
      supabase.from('programs').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
    ]);

    // Distinct users in programs and individual courses (active)
    const [{ data: enrs }, { data: cenrs }] = await Promise.all([
      supabase.from('enrollments').select('user_id').eq('status', 'active'),
      supabase.from('course_enrollments').select('user_id').eq('status', 'active'),
    ]);
    const usersInPrograms = new Set((enrs || []).map((e: any) => e.user_id)).size;
    const usersInIndividual = new Set((cenrs || []).map((e: any) => e.user_id)).size;

    // New users last periods
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: pWeek }, { data: pMonth }, { data: pYear }] = await Promise.all([
      supabase.from('profiles').select('id').gte('created_at', weekAgo),
      supabase.from('profiles').select('id').gte('created_at', monthAgo),
      supabase.from('profiles').select('id').gte('created_at', yearAgo),
    ]);

    // Totals by role
    const [{ count: totalStudents }, { count: totalTeachers }, { count: totalVolunteers }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'voluntario'),
    ]);

    // Lesson progress aggregate (range-aware)
    let lpSelect = supabase
      .from('lesson_progress')
      .select('watched_seconds, updated_at, user_id, lessons!inner(course_id, courses!inner(title))')
      .limit(20000) as any;
    if (startIso && endIso) {
      lpSelect = lpSelect.gte('updated_at', startIso).lt('updated_at', endIso);
    }
    const { data: lps } = await lpSelect;
    const minutesByCourse: Record<string, { title: string; minutes: number }> = {};
    const activeSet = new Set<string>();
    (lps || []).forEach((row: any) => {
      const cid = row.lessons?.course_id;
      const title = row.lessons?.courses?.title || 'Curso';
      if (row.user_id) activeSet.add(row.user_id);
      if (!cid) return;
      if (!minutesByCourse[cid]) minutesByCourse[cid] = { title, minutes: 0 };
      minutesByCourse[cid].minutes += Math.floor((row.watched_seconds || 0) / 60);
    });
    const topCoursesArr = Object.entries(minutesByCourse)
      .map(([courseId, v]) => ({ courseId, title: v.title, minutes: v.minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    // Top program using program_courses
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
        const cmin = minutesByCourse[row.course_id]?.minutes || 0;
        if (!minutesByProgram[pid]) minutesByProgram[pid] = { title, minutes: 0 };
        minutesByProgram[pid].minutes += cmin;
      });
      const topProg = Object.values(minutesByProgram).sort((a, b) => b.minutes - a.minutes)[0];
      if (topProg) { topProgramTitle = topProg.title; topProgramMinutes = topProg.minutes; }
    }

    // Active users last 30 days (rolling, independent of range)
    const monthBack = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    const { data: lpM } = await supabase.from('lesson_progress').select('user_id').gte('updated_at', monthBack);
    const active30 = new Set((lpM || []).map((r: any) => r.user_id).filter(Boolean)).size;
    const weekBack = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    const { data: lp7 } = await supabase.from('lesson_progress').select('user_id').gte('updated_at', weekBack);
    const active7 = new Set((lp7 || []).map((r: any) => r.user_id).filter(Boolean)).size;

    // Active users last 20 days list
    const twentyBack = new Date(Date.now() - 20*24*60*60*1000).toISOString();
    const { data: lp20 } = await supabase.from('lesson_progress').select('user_id').gte('updated_at', twentyBack).limit(5000);
    const ids20 = Array.from(new Set((lp20 || []).map((r: any) => r.user_id).filter(Boolean)));
    let activeUsers20List: Array<{ id: string; full_name: string }> = [];
    if (ids20.length > 0) {
      const { data: u20 } = await supabase.from('profiles').select('id, full_name').in('id', ids20).limit(12);
      activeUsers20List = (u20 || []).map((u: any) => ({ id: u.id, full_name: u.full_name || '' }));
    }

    // Active students month
    let totalActiveStudentsMonth = 0;
    if (lpM && lpM.length > 0) {
      const ids = Array.from(new Set(lpM.map((r: any) => r.user_id).filter(Boolean)));
      const { data: actStudents } = await supabase.from('profiles').select('id').eq('role', 'student').in('id', ids);
      totalActiveStudentsMonth = (actStudents || []).length;
    }

    // Active users list (limit 12 names)
    let activeUsersList: Array<{ id: string; full_name: string }> = [];
    if (activeSet.size > 0) {
      const ids = Array.from(activeSet).slice(0, 100);
      const { data: actUsers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
        .limit(12);
      activeUsersList = (actUsers || []).map((u: any) => ({ id: u.id, full_name: u.full_name || '' }));
    }

    const result = {
      programs: programs || 0,
      courses: courses || 0,
      usersInPrograms,
      usersInIndividual,
      newWeek: (pWeek || []).length,
      newMonth: (pMonth || []).length,
      newYear: (pYear || []).length,
      active30,
      active7,
      totalStudents: totalStudents || 0,
      totalActiveStudentsMonth,
      totalTeachers: totalTeachers || 0,
      totalVolunteers: totalVolunteers || 0,
      topCourses: topCoursesArr,
      topCourseTitle: topCoursesArr[0]?.title || '',
      topCourseMinutes: topCoursesArr[0]?.minutes || 0,
      topProgramTitle,
      topProgramMinutes,
      activeUsersList,
      activeUsers20List,
    };

    return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'unknown_error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


