import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const url = new URL(req.url);
    const roleParam = (url.searchParams.get('role') || 'todos').toLowerCase();
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '20', 10), 1), 1000);
    const sortBy = (url.searchParams.get('sortBy') || 'created_at').toLowerCase(); // 'name' | 'email' | 'created_at'
    const sortDir = (url.searchParams.get('sortDir') || 'desc').toLowerCase(); // 'asc' | 'desc'
    const returnAll = (url.searchParams.get('all') || 'false').toLowerCase() === 'true';

    // List auth users with a large page to allow filtering/pagination server-side
    const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 2000 });
    if (listErr) throw listErr;
    const authUsers = listRes?.users || [];

    const userIds = authUsers.map(u => u.id);
    let { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, role, created_at')
      .in('id', userIds);

    profiles = profiles || [];
    const idToProfile: Record<string, any> = {};
    profiles.forEach(p => { idToProfile[p.id] = p; });

    // Merge and filter by role/search
    const merged = authUsers.map(u => {
      const p = idToProfile[u.id] || {};
      const meta = (u as any).user_metadata || {};
      const derivedName = p.full_name || meta.full_name || meta.name || (u.email ? (u.email.split('@')[0] || '') : '');
      return {
        id: u.id,
        email: u.email || '',
        full_name: derivedName,
        role: p.role || 'student',
        created_at: p.created_at || u.created_at || null,
        last_sign_in_at: (u as any).last_sign_in_at || null,
      };
    });

    const roleFilter = (r: string) => {
      if (roleParam === 'todos') return true;
      return (r || 'student') === roleParam;
    };
    const searchFilter = (u: any) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      
      // Búsqueda más inteligente: palabras separadas, coincidencias parciales
      const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
      
      // Si hay múltiples palabras, todas deben coincidir
      if (searchWords.length > 1) {
        return searchWords.every(word => 
          name.includes(word) || email.includes(word)
        );
      }
      
      // Búsqueda simple para una palabra
      return name.includes(searchLower) || email.includes(searchLower);
    };

    let filtered = merged.filter(u => roleFilter(u.role) && searchFilter(u));

    // Attach program enrollments count and search by programs/courses
    if (filtered.length > 0) {
      const ids = filtered.map(u => u.id);
      const [{ data: enrs }, { data: cenrs }] = await Promise.all([
        admin
          .from('enrollments')
          .select('user_id, programs(title)')
          .eq('status', 'active')
          .in('user_id', ids),
        admin
          .from('course_enrollments')
          .select('user_id, courses(title)')
          .eq('status', 'active')
          .in('user_id', ids)
      ]);
      
      const programCountByUser: Record<string, number> = {};
      const programsByUser: Record<string, string[]> = {};
      const coursesByUser: Record<string, string[]> = {};
      
      (enrs || []).forEach((e: any) => {
        const uid = e.user_id;
        if (!uid) return;
        programCountByUser[uid] = (programCountByUser[uid] || 0) + 1;
        if (e.programs?.title) {
          if (!programsByUser[uid]) programsByUser[uid] = [];
          programsByUser[uid].push(e.programs.title);
        }
      });
      
      (cenrs || []).forEach((e: any) => {
        const uid = e.user_id;
        if (!uid) return;
        if (e.courses?.title) {
          if (!coursesByUser[uid]) coursesByUser[uid] = [];
          coursesByUser[uid].push(e.courses.title);
        }
      });
      
      // Si hay búsqueda, filtrar también por programas y cursos
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(u => {
          const userPrograms = (programsByUser[u.id] || []).join(' ').toLowerCase();
          const userCourses = (coursesByUser[u.id] || []).join(' ').toLowerCase();
          return userPrograms.includes(searchLower) || userCourses.includes(searchLower);
        });
      }
      
      filtered = filtered.map(u => ({ 
        ...u, 
        program_enrollments: programCountByUser[u.id] || 0,
        programs: programsByUser[u.id] || [],
        courses: coursesByUser[u.id] || []
      }));
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let av: any; let bv: any;
      if (sortBy === 'name') { av = a.full_name || ''; bv = b.full_name || ''; return av.localeCompare(bv) * dir; }
      if (sortBy === 'email') { av = a.email || ''; bv = b.email || ''; return av.localeCompare(bv) * dir; }
      av = a.created_at ? new Date(a.created_at).getTime() : 0;
      bv = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (av - bv) * dir;
    });

    const totalFiltered = filtered.length;
    const paginated = returnAll ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize);

    // Counts by role (global totals, not just current page)
    const [{ count: total }, { count: totalStudents }, { count: totalTeachers }, { count: totalAdmins }, { count: totalVols }] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'voluntario'),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          users: paginated,
          total: totalFiltered,
          page,
          pageSize,
          counts: {
            total: total || 0,
            student: totalStudents || 0,
            teacher: totalTeachers || 0,
            admin: totalAdmins || 0,
            voluntario: totalVols || 0,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'unknown_error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


