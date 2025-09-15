import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SLACK_API_BASE = "https://slack.com/api";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing SLACK_BOT_TOKEN env var" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);
    if (req.method === "GET") {
      const channel = url.searchParams.get("channel");
      const limit = url.searchParams.get("limit") ?? "30";
      if (!channel) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing channel param" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const slackRes = await fetch(`${SLACK_API_BASE}/conversations.history?channel=${channel}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await slackRes.json();
      if (!data.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.error ?? "slack_error" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, messages: data.messages ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { channel, text } = body as { channel?: string; text?: string };
      if (!channel || !text || !text.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing channel or text" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const slackRes = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel, text }),
      });
      const data = await slackRes.json();
      if (!data.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.error ?? "slack_error" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, ts: data.ts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});


