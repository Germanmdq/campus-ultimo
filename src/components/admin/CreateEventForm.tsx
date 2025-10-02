import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, Users, Globe, UserCheck, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateEventForm({ open, onOpenChange, onSuccess }: CreateEventFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [target_scope, setTargetScope] = useState<'all' | 'students' | 'teachers'>('all');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<'campus' | 'program' | 'course'>('campus');
  const [programId, setProgramId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [programs, setPrograms] = useState<Array<{ id: string; title: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    (async () => {
      const { data: progs } = await supabase
        .from('programs')
        .select('id, title')
        .order('title');
      setPrograms(progs || []);
      const { data: cs } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      setCourses(cs || []);
    })();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setTargetScope('all');
    setMeetingUrl('');
    setScope('campus');
    setProgramId('');
    setCourseId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    if (scope === 'program' && !programId) {
      toast({ title: 'Falta seleccionar programa', variant: 'destructive' });
      return;
    }
    if (scope === 'course' && !courseId) {
      toast({ title: 'Falta seleccionar curso', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    const payload = {
      title,
      description: description || null,
      start_at: startDateTime.toISOString(),
      end_at: endDateTime.toISOString(),
      target_scope,
      meeting_url: meetingUrl || null,
      created_by: profile.id,
      program_id: scope === 'program' ? programId : null,
      course_id: scope === 'course' ? courseId : null,
    };

    console.log('Payload:', payload);

    const { data, error } = await supabase.from('events').insert(payload);

    console.log('Response data:', data);
    console.log('Response error:', error);

    if (error) {
      console.error('SUPABASE ERROR:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    console.log('Success!');
    toast({ title: "Evento creado" });
    resetForm();
    onOpenChange(false);
    onSuccess?.();
    setLoading(false);
  };

  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case 'students': return <GraduationCap className="h-4 w-4" />;
      case 'teachers': return <UserCheck className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = (vis: string) => {
    switch (vis) {
      case 'students': return 'Solo Estudiantes';
      case 'teachers': return 'Solo Profesores';
      default: return 'Todo el Campus';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Crear Evento
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo evento que será notificado automáticamente a los miembros del campus
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título del Evento</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Clase magistral de Geometría Sagrada"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los detalles del evento..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Fecha de Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="start-time">Hora de Inicio</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="end-date">Fecha de Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end-time">Hora de Fin</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Destino del evento</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button type="button" variant={scope === 'campus' ? 'default' : 'outline'} onClick={() => setScope('campus')}>
                Campus
              </Button>
              <Button type="button" variant={scope === 'program' ? 'default' : 'outline'} onClick={() => setScope('program')}>
                Programa
              </Button>
              <Button type="button" variant={scope === 'course' ? 'default' : 'outline'} onClick={() => setScope('course')}>
                Curso
              </Button>
            </div>
            {scope === 'program' && (
              <div className="mt-3">
                <Label>Seleccionar programa</Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí un programa" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {scope === 'course' && (
              <div className="mt-3">
                <Label>Seleccionar curso</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí un curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="meeting-url">URL de Reunión (opcional)</Label>
            <Input
              id="meeting-url"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL de la plataforma de videoconferencia (Zoom, Meet, Teams, etc.)
            </p>
          </div>

          <div>
            <Label htmlFor="target_scope">Alcance del Evento</Label>
            <Select value={target_scope} onValueChange={(value: any) => setTargetScope(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Todo el Campus
                  </div>
                </SelectItem>
                <SelectItem value="students">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Solo Estudiantes
                  </div>
                </SelectItem>
                <SelectItem value="teachers">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Solo Profesores
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Las notificaciones se enviarán automáticamente al grupo seleccionado
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}