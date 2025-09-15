import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const GETRESPONSE_API_KEY = Deno.env.get('GETRESPONSE_API_KEY');

    const payload = (await req.json()) as EmailPayload;
    const { to, subject, html, text, from, replyTo, cc, bcc } = payload || {} as EmailPayload;

    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, and html or text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GETRESPONSE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing GETRESPONSE_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build GetResponse payload only
    function parseFromAddress(input?: string): { email: string; name: string } {
      const envEmail = Deno.env.get('GETRESPONSE_FROM_EMAIL') || '';
      const envName = Deno.env.get('GETRESPONSE_FROM_NAME') || 'Campus';
      if (!input && envEmail) return { email: envEmail, name: envName };
      const str = input || '';
      const match = str.match(/^\s*(.*?)\s*<\s*(.*?)\s*>\s*$/);
      if (match) {
        return { name: match[1] || envName, email: match[2] || envEmail || 'no-reply@example.com' };
      }
      if (str.includes('@')) return { email: str.trim(), name: envName };
      return { email: envEmail || 'no-reply@example.com', name: str || envName };
    }

    const fromObj = parseFromAddress(from);
    const recipients = Array.isArray(to) ? to : [to];
    const toArray = recipients.filter(Boolean).map((r) => ({ email: String(r) }));
    const replyToValue = replyTo || Deno.env.get('GETRESPONSE_REPLY_TO') || fromObj.email;

    const grBody = {
      from: { email: fromObj.email, name: fromObj.name },
      subject,
      content: { html: html || undefined, plain: text || undefined },
      replyTo: replyToValue,
      to: toArray,
    } as Record<string, unknown>;

    const grRes = await fetch('https://api.getresponse.com/v3/transactional/emails', {
      method: 'POST',
      headers: {
        'X-Auth-Token': `api-key ${GETRESPONSE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(grBody)
    });

    const grData = await grRes.json().catch(() => ({}));
    if (!grRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: grData?.message || grData?.code || 'getresponse_error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: grData?.messageId || grData?.queueId || 'ok' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'unknown_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


