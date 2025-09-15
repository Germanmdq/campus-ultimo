import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

type AssignPayload = {
  user_id: string;
  action: 'mark_lesson' | 'mark_course' | 'reset_course';
  lesson_id?: string;
  course_id?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const body = await req.json().catch(() => ({}));
    const { user_id, action, lesson_id, course_id } = body as AssignPayload;

    if (!user_id || !action) {
      return new Response(JSON.stringify({ success: false, error: 'missing_fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'mark_lesson') {
      if (!lesson_id) return new Response(JSON.stringify({ success: false, error: 'missing_lesson_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: lesson } = await supabase
        .from('lessons')
        .select('duration_minutes')
        .eq('id', lesson_id)
        .maybeSingle();
      const watched = Math.max(1, Math.floor((lesson?.duration_minutes || 0) * 60));
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({ user_id, lesson_id, completed: true, approved: true, watched_seconds: watched }, { onConflict: 'user_id,lesson_id' });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'mark_course') {
      if (!course_id) return new Response(JSON.stringify({ success: false, error: 'missing_course_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, duration_minutes')
        .eq('course_id', course_id);
      const rows = (lessons || []).map((l) => ({
        user_id,
        lesson_id: l.id,
        completed: true,
        approved: true,
        watched_seconds: Math.max(1, Math.floor((l.duration_minutes || 0) * 60))
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('lesson_progress').upsert(rows, { onConflict: 'user_id,lesson_id' });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true, upserted: rows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'reset_course') {
      if (!course_id) return new Response(JSON.stringify({ success: false, error: 'missing_course_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', course_id);
      const lessonIds = (lessons || []).map((l) => l.id);
      if (lessonIds.length > 0) {
        const { error } = await supabase
          .from('lesson_progress')
          .delete()
          .eq('user_id', user_id)
          .in('lesson_id', lessonIds);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true, deleted: lessonIds.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'invalid_action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'unknown_error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
