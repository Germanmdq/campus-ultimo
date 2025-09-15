import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html?: string; text?: string }) {
  const GETRESPONSE_API_KEY = Deno.env.get('GETRESPONSE_API_KEY');
  if (!GETRESPONSE_API_KEY) throw new Error('Missing GETRESPONSE_API_KEY');
  const fromEmail = Deno.env.get('GETRESPONSE_FROM_EMAIL') || 'no-reply@example.com';
  const fromName = Deno.env.get('GETRESPONSE_FROM_NAME') || 'Campus';
  const replyTo = Deno.env.get('GETRESPONSE_REPLY_TO') || fromEmail;
  const grBody = {
    from: { email: fromEmail, name: fromName },
    subject,
    content: { html: html || undefined, plain: text || undefined },
    replyTo,
    to: [{ email: to }],
  } as Record<string, unknown>;
  const grRes = await fetch('https://api.getresponse.com/v3/transactional/emails', {
    method: 'POST',
    headers: { 'X-Auth-Token': `api-key ${GETRESPONSE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(grBody),
  });
  if (!grRes.ok) {
    const data = await grRes.json().catch(() => ({}));
    throw new Error(data?.message || data?.code || 'getresponse_error');
  }
}

function baseHtmlTemplate({ title, body, ctaLabel, ctaUrl }: { title: string; body: string; ctaLabel?: string; ctaUrl?: string }) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#0b0b0b; color:#e5e5e5; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111213;border:1px solid #232323;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #232323;"><h1 style="margin:0;font-size:18px;">${title}</h1></div>
      <div style="padding:24px;line-height:1.6;">${body}
        ${ctaLabel && ctaUrl ? `<div style=\"margin-top:20px;\"><a href=\"${ctaUrl}\" style=\"display:inline-block;padding:10px 14px;border-radius:8px;background:#1f2937;color:white;text-decoration:none;\">${ctaLabel}</a></div>` : ''}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #232323;font-size:12px;color:#9ca3af;">Enviado por el Campus</div>
    </div>
  </div>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const now = new Date();
    const nineteenDaysAgo = new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000);

    // Fetch users
    const { data: ps } = await supabase.from('profiles').select('id, full_name').limit(500);
    const candidates: Array<{ id: string; email: string; full_name: string }> = [];
    for (const p of ps || []) {
      const { data: authUser } = await supabase.auth.admin.getUserById(p.id).catch(() => ({ data: null }));
      if (authUser?.user?.email) candidates.push({ id: p.id, email: authUser.user.email, full_name: p.full_name || 'Estudiante' });
    }

    let sent = 0;
    for (const u of candidates) {
      // Compute last activity
      const { data: lp } = await supabase.from('lesson_progress').select('updated_at').eq('user_id', u.id).order('updated_at', { ascending: false }).limit(1);
      const { data: asg } = await supabase.from('assignments').select('created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1);
      const { data: msg } = await supabase.from('messages').select('created_at').or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`).order('created_at', { ascending: false }).limit(1);

      const lastDates = [lp?.[0]?.updated_at, asg?.[0]?.created_at, msg?.[0]?.created_at].filter(Boolean).map((d: string) => new Date(d));
      const last = lastDates.length ? new Date(Math.max(...lastDates.map(d => d.getTime()))) : null;

      if (!last || last < nineteenDaysAgo) {
        const subject = `Te extrañamos · Hace 19 días sin actividad`;
        const body = `<p>Retomá tu formación cuando quieras. Estamos para ayudarte.</p>`;
        const html = baseHtmlTemplate({ title: subject, body, ctaLabel: 'Volver al Campus', ctaUrl: `${new URL(req.url).origin}` });
        await sendEmail({ to: u.email, subject, html });
        sent += 1;
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'unknown_error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


