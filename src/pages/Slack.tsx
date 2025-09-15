import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SLACK_URL = 'https://app.slack.com/client/T059VRF02L8/C05964WLPMZ';
const SLACK_CHANNEL_ID = 'C05964WLPMZ';
const EDGE_URL = 'https://epqalebkqmkddlfomnyf.functions.supabase.co/slack-proxy';

interface SlackMessage {
  ts: string;
  text?: string;
  user?: string;
  bot_id?: string;
}

export default function Slack() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [edgeAvailable, setEdgeAvailable] = useState(true);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts)),
    [messages]
  );

  const openSlack = () => {
    window.open(SLACK_URL, '_blank', 'noopener,noreferrer');
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${EDGE_URL}?channel=${SLACK_CHANNEL_ID}`);
      if (!res.ok) throw new Error('edge_unavailable');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'edge_error');
      setMessages(data.messages || []);
      setEdgeAvailable(true);
    } catch (e) {
      setEdgeAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: SLACK_CHANNEL_ID, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'edge_error');
      setText('');
      loadMessages();
    } catch (e: any) {
      toast({ title: 'No se pudo enviar', description: 'Abrí Slack para continuar.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const id = setInterval(loadMessages, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Slack</h1>
        <p className="text-muted-foreground">Vista del canal del equipo dentro del campus</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canal principal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!edgeAvailable && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Para ver y enviar mensajes acá necesitamos configurar una app de Slack. Por ahora podés abrir el canal directamente.
            </div>
          )}

          <div className="h-96 overflow-y-auto rounded-md border p-3 bg-background/50">
            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando mensajes...</div>
            ) : sortedMessages.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay mensajes aún</div>
            ) : (
              <div className="space-y-3">
                {sortedMessages.map((m) => (
                  <div key={m.ts} className="text-sm">
                    <div className="opacity-70">{m.user ? `@${m.user}` : 'bot'}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Escribir mensaje para Slack..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage} disabled={sending || !text.trim()} className="gap-2">
              Enviar
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Button onClick={openSlack} variant="outline" className="gap-2">
              Abrir en Slack
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


