// ========================================
// CÓDIGO DE TRABAJOS PRÁCTICOS - PROFESOR
// ========================================

// 1. INTERFACES
interface Assignment {
  id: string;
  user_id: string;
  lesson_id: string;
  status: 'submitted' | 'approved' | 'rejected';
  file_url?: string;
  text_answer?: string;
  grade?: number;
  feedback?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  lesson: {
    title: string;
    course: {
      title: string;
    };
  };
  user_profile: {
    full_name: string;
  };
}

// 2. ESTADOS NECESARIOS
const [assignments, setAssignments] = useState<Assignment[]>([]);
const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
const [feedback, setFeedback] = useState('');
const [grade, setGrade] = useState('');
const [submitting, setSubmitting] = useState(false);

// 3. FUNCIÓN PARA CARGAR TRABAJOS PENDIENTES
const fetchData = async () => {
  try {
    setLoading(true);
    
    // Fetch pending assignments
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        *,
        lesson:lessons(
          title,
          course:courses(title)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (assignmentsError) throw assignmentsError;
    
    // Get user profiles for assignments
    const assignmentsWithProfiles = await Promise.all(
      (assignmentsData || []).map(async (assignment) => {
        const [{ data: profileData }, lessonInfo] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', assignment.user_id)
            .single(),
          assignment.lesson ? Promise.resolve({ data: assignment.lesson }) : supabase
            .from('lessons')
            .select('title, course:courses(title)')
            .eq('id', assignment.lesson_id)
            .single()
        ]);

        return {
          ...assignment,
          lesson: lessonInfo?.data || assignment.lesson,
          user_profile: {
            full_name: profileData?.full_name || 'Usuario desconocido'
          }
        };
      })
    );
    
    setAssignments(assignmentsWithProfiles);

  } catch (error) {
    console.error('Error fetching data:', error);
    toast({
      title: "Error",
      description: "No se pudieron cargar los datos",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

// 4. FUNCIÓN PARA APROBAR/RECHAZAR TRABAJOS
const handleApproveAssignment = async (assignmentId: string, action: 'approved' | 'rejected') => {
  if (!feedback.trim() && action === 'rejected') {
    toast({
      title: "Error",
      description: "El feedback es requerido para rechazar una entrega",
      variant: "destructive",
    });
    return;
  }

  const gradeValue = grade !== '' ? parseInt(grade) : null;
  if (action === 'approved' && gradeValue !== null && gradeValue < 0) {
    toast({
      title: "Error",
      description: "La calificación debe ser un número positivo",
      variant: "destructive",
    });
    return;
  }

  setSubmitting(true);
  try {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    // Update assignment
    const { error: updateError } = await supabase
      .from('assignments')
      .update({
        status: action,
        grade: gradeValue,
        feedback: feedback.trim(),
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (updateError) throw updateError;

    // Si se aprobó, enviar email al alumno
    if (action === 'approved') {
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', assignment.user_id)
        .single();
      if (studentProfile?.email) {
        try {
          await sendModuleCompletedEmail({
            to: studentProfile.email,
            modulo: assignment.lesson.title,
            proximo: undefined,
            ctaUrl: `${window.location.origin}/curso/${assignment.lesson_id}`,
          });
        } catch {}
      }
    }

    toast({
      title: "Éxito",
      description: `Entrega ${action === 'approved' ? 'aprobada' : 'rechazada'} y notificación enviada`,
    });

    // Reset form
    setSelectedAssignment(null);
    setFeedback('');
    setGrade('');
    
    // Refresh data
    fetchData();

  } catch (error) {
    console.error('Error processing assignment:', error);
    toast({
      title: "Error",
      description: "No se pudo procesar la entrega",
      variant: "destructive",
    });
  } finally {
    setSubmitting(false);
  }
};

// 5. FUNCIÓN PARA FORMATEAR FECHAS
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 6. INTERFAZ DE USUARIO - LISTA DE TRABAJOS
{pendingAssignments.map(assignment => (
  <Card key={assignment.id} className="transition-all hover:shadow-md">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg">{assignment.lesson?.title || 'Lección'}</CardTitle>
          <p className="text-sm text-muted-foreground">{assignment.lesson?.course?.title || 'Curso'}</p>
        </div>
        <Badge variant="secondary">
          {assignment.status === 'approved' ? 'Aprobada' : 
           assignment.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{assignment.user_profile.full_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatDate(assignment.created_at)}
          </span>
        </div>
      </div>
      {(assignment.file_url || assignment.text_answer) && (
        <div className="flex items-center gap-2 mt-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {assignment.file_url ? 'Archivo adjunto' : 'Respuesta de texto'}
          </span>
        </div>
      )}
      
      {/* Botones de acción */}
      <div className="flex gap-2 mt-4">
        <Button
          size="sm"
          onClick={() => setSelectedAssignment(assignment)}
          className="flex-1"
        >
          Revisar
        </Button>
        {assignment.file_url && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(assignment.file_url, '_blank')}
          >
            Ver Archivo
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
))}

// 7. MODAL PARA REVISAR TRABAJO
{selectedAssignment && (
  <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Revisar Trabajo</DialogTitle>
        <DialogDescription>
          {selectedAssignment.lesson?.title} - {selectedAssignment.user_profile.full_name}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        {/* Contenido del trabajo */}
        {selectedAssignment.text_answer && (
          <div>
            <Label>Respuesta del estudiante:</Label>
            <div className="p-3 border rounded-md bg-muted/50">
              {selectedAssignment.text_answer}
            </div>
          </div>
        )}
        
        {selectedAssignment.file_url && (
          <div>
            <Label>Archivo adjunto:</Label>
            <Button
              variant="outline"
              onClick={() => window.open(selectedAssignment.file_url, '_blank')}
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Archivo
            </Button>
          </div>
        )}
        
        {/* Formulario de revisión */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escribe tu feedback aquí..."
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="grade">Calificación (opcional)</Label>
            <Input
              id="grade"
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Ej: 85"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleApproveAssignment(selectedAssignment.id, 'approved')}
              disabled={submitting}
              className="flex-1"
            >
              Aprobar
            </Button>
            <Button
              onClick={() => handleApproveAssignment(selectedAssignment.id, 'rejected')}
              disabled={submitting || !feedback.trim()}
              variant="destructive"
              className="flex-1"
            >
              Rechazar
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)}
