// ========================================
// CÓDIGO DE TRABAJOS PRÁCTICOS - ESTUDIANTE
// ========================================

// 1. INTERFACES
interface Lesson {
  id: string;
  title: string;
  description?: string;
  slug: string;
  video_url?: string;
  duration_minutes: number;
  has_assignment: boolean;  // ← Indica si la lección tiene trabajo práctico
  has_materials: boolean;
  course_id: string;
}

// 2. ESTADOS NECESARIOS
const [dropboxLink, setDropboxLink] = useState('');
const [textAnswer, setTextAnswer] = useState('');
const [submitting, setSubmitting] = useState(false);
const [alreadySubmitted, setAlreadySubmitted] = useState(false);

// 3. FUNCIÓN PARA NORMALIZAR ENLACES DROPBOX
const normalizeDropboxLink = (url: string) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('dropbox.com')) {
      // Convertir enlace de vista a enlace de descarga
      return urlObj.toString().replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }
    return url;
  } catch {
    return url;
  }
};

// 4. FUNCIÓN PRINCIPAL PARA ENVIAR TRABAJO
const handleSubmitAssignment = async () => {
  if (!lesson || !profile) return;
  const link = dropboxLink.trim();
  if (!link) {
    toast({ 
      title: 'Falta el enlace', 
      description: 'Pegá el enlace de Dropbox del archivo.', 
      variant: 'destructive' 
    });
    return;
  }
  setSubmitting(true);
  try {
    const fileUrl = normalizeDropboxLink(link);
    const payload = {
      user_id: profile.id,
      lesson_id: lesson.id,
      text_answer: textAnswer.trim() || null,
      file_url: fileUrl,
      status: 'submitted' as const,
    };

    // upsert para permitir re-envío (manteniendo una fila por user/lesson)
    const { error } = await supabase
      .from('assignments')
      .upsert(payload, { onConflict: 'user_id,lesson_id' });
    if (error) throw error;

    setAlreadySubmitted(true);
    toast({ 
      title: 'Enviado', 
      description: 'Tu trabajo fue enviado para revisión.' 
    });
  } catch (e: any) {
    toast({ 
      title: 'Error', 
      description: e?.message || 'No se pudo enviar el trabajo.', 
      variant: 'destructive'
    });
  } finally {
    setSubmitting(false);
  }
};

// 5. VERIFICAR SI YA ENVIÓ TRABAJO
// Check if the student already submitted an assignment
if (profile && lessonData?.id) {
  const { data: existing } = await supabase
    .from('assignments')
    .select('id, status, file_url, text_answer')
    .eq('user_id', profile.id)
    .eq('lesson_id', lessonData.id)
    .single();
  
  if (existing) {
    setAlreadySubmitted(true);
    setDropboxLink(existing.file_url || '');
    setTextAnswer(existing.text_answer || '');
  }
}

// 6. INTERFAZ DE USUARIO - BOTÓN PARA ENVIAR
{lesson.has_assignment && (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">Tiene entregable</span>
    </div>
    {profile?.role === 'student' && (
      <div className="space-y-2 p-3 border rounded-md">
        <Button
          className="w-full"
          onClick={() => window.open('https://www.dropbox.com/request/LlaRtF8KefIoXHjdg0Uo', '_blank')}
        >
          Enviar trabajo práctico (Dropbox)
        </Button>
      </div>
    )}
  </div>
)}

// 7. FORMULARIO COMPLETO PARA ENVIAR TRABAJO
{lesson.has_assignment && profile?.role === 'student' && (
  <Card>
    <CardHeader>
      <CardTitle>Trabajo Práctico</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {alreadySubmitted ? (
        <div className="text-center py-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-green-600 font-medium">Trabajo enviado</p>
          <p className="text-sm text-muted-foreground">
            Tu trabajo fue enviado para revisión
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="dropboxLink">Enlace de Dropbox</Label>
            <Input
              id="dropboxLink"
              value={dropboxLink}
              onChange={(e) => setDropboxLink(e.target.value)}
              placeholder="Pega aquí el enlace de Dropbox de tu archivo"
            />
          </div>
          
          <div>
            <Label htmlFor="textAnswer">Comentarios (opcional)</Label>
            <Textarea
              id="textAnswer"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Agrega comentarios sobre tu trabajo..."
              rows={3}
            />
          </div>
          
          <Button 
            onClick={handleSubmitAssignment}
            disabled={submitting || !dropboxLink.trim()}
            className="w-full"
          >
            {submitting ? 'Enviando...' : 'Enviar Trabajo'}
          </Button>
        </>
      )}
    </CardContent>
  </Card>
)}
