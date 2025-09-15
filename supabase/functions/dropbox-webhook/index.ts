import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

type DropboxListFolderEntry = {
  ".tag": "file" | "folder" | string;
  name: string;
  path_display: string;
  id: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function fetchDropbox(url: string, init?: RequestInit) {
  const token = Deno.env.get('DROPBOX_ACCESS_TOKEN');
  if (!token) throw new Error('Missing DROPBOX_ACCESS_TOKEN');
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  return fetch(url, { ...init, headers });
}

async function listFolderContinue(cursor: string) {
  const res = await fetchDropbox('https://api.dropboxapi.com/2/files/list_folder/continue', {
    method: 'POST',
    body: JSON.stringify({ cursor }),
  });
  if (!res.ok) throw new Error('dropbox_list_continue_error');
  return res.json();
}

async function listFolderInitial(path: string) {
  const res = await fetchDropbox('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    body: JSON.stringify({ path, recursive: true, include_non_downloadable_files: false })
  });
  if (!res.ok) throw new Error('dropbox_list_error');
  return res.json();
}

async function getTemporaryLink(path: string): Promise<string | null> {
  const res = await fetchDropbox('https://api.dropboxapi.com/2/files/get_temporary_link', {
    method: 'POST',
    body: JSON.stringify({ path })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.link ?? null;
}

function parseFilename(name: string): { lessonSlug: string | null; email: string | null } {
  // Expected: lesson_slug__user_email__anything.ext OR lesson_slug__user_email.ext
  const base = name.split('/').pop() || name;
  const parts = base.split('__');
  if (parts.length < 2) return { lessonSlug: null, email: null };
  const lessonSlug = parts[0];
  const emailPart = parts[1];
  // crude email validation
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailPart)) return { lessonSlug: null, email: null };
  return { lessonSlug, email: emailPart };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Dropbox webhook verification
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    if (challenge) return new Response(challenge, { headers: { 'Content-Type': 'text/plain', ...corsHeaders } });
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const supabase = await getSupabaseAdmin();

    // Load or init cursor
    const { data: stateRow } = await supabase.from('dropbox_state').select('cursor').eq('id', 1).maybeSingle();
    let cursor = stateRow?.cursor ?? null;

    let changes: { entries: DropboxListFolderEntry[]; cursor: string } | null = null;
    if (cursor) {
      const data = await listFolderContinue(cursor);
      changes = { entries: (data?.entries || []) as DropboxListFolderEntry[], cursor: data?.cursor };
    } else {
      // Default monitored path
      const monitoredPath = Deno.env.get('DROPBOX_ENTREGAS_PATH') ?? '';
      const data = await listFolderInitial(monitoredPath);
      changes = { entries: (data?.entries || []) as DropboxListFolderEntry[], cursor: data?.cursor };
    }

    if (!changes) throw new Error('no_changes');

    // Upsert cursor
    await supabase.from('dropbox_state').upsert({ id: 1, cursor: changes.cursor, updated_at: new Date().toISOString() });

    // Process file entries
    for (const entry of changes.entries) {
      if (entry[".tag"] !== 'file') continue;
      const { lessonSlug, email } = parseFilename(entry.name);
      if (!lessonSlug || !email) continue;

      // Resolve user by email (auth admin API)
      const { data: userByEmail } = await supabase.auth.admin.listUsers({ email });
      const user = userByEmail?.users?.[0];
      if (!user) continue;

      // Resolve lesson by slug
      const { data: lesson } = await supabase.from('lessons').select('id').eq('slug', lessonSlug).single();
      if (!lesson) continue;

      // Get a temporary link for the file
      const tempLink = await getTemporaryLink(entry.path_display);

      // Upsert assignment as submitted
      await supabase.from('assignments').upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        status: 'submitted',
        file_url: tempLink ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'unknown_error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


