import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const EDGE_URL = 'https://epqalebkqmkddlfomnyf.functions.supabase.co/email-dispatcher';

export default function EmailTest() {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Hola desde el Campus');
  const [html, setHtml] = useState('<p>Mensaje de prueba</p>');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'send_error');
      toast({ title: 'Enviado', description: `ID: ${data.id}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo enviar', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Test de Emails</h1>
        <p className="text-muted-foreground">Enviá un correo de prueba con Resend</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enviar correo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm">Para</label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@ejemplo.com" />
          </div>
          <div>
            <label className="text-sm">Asunto</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">HTML</label>
            <Textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={8} />
          </div>
          <div className="flex justify-end">
            <Button onClick={send} disabled={sending || !to || !subject || !html}>Enviar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


