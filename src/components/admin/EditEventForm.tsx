import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  target_scope: 'all' | 'students' | 'teachers';
  meeting_url?: string;
  created_by: string;
}

interface EditEventFormProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditEventForm({ event, open, onOpenChange, onSuccess }: EditEventFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
    target_scope: 'all' as 'all' | 'students' | 'teachers',
    meeting_url: ''
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start_at: event.start_at ? new Date(event.start_at).toISOString().slice(0, 16) : '',
        end_at: event.end_at ? new Date(event.end_at).toISOString().slice(0, 16) : '',
        target_scope: event.target_scope || 'all',
        meeting_url: event.meeting_url || ''
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          start_at: formData.start_at,
          end_at: formData.end_at,
          target_scope: formData.target_scope,
          meeting_url: formData.meeting_url.trim() || null
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Evento actualizado",
        description: "El evento fue actualizado exitosamente"
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el evento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título del Evento</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Nombre del evento"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del evento (opcional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_at">Fecha y Hora de Inicio</Label>
              <Input
                id="start_at"
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_at">Fecha y Hora de Fin</Label>
              <Input
                id="end_at"
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="target_scope">Alcance</Label>
            <Select
              value={formData.target_scope}
              onValueChange={(value: 'all' | 'students' | 'teachers') => 
                setFormData(prev => ({ ...prev, target_scope: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="students">Solo Estudiantes</SelectItem>
                <SelectItem value="teachers">Solo Formadores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="meeting_url">URL de Reunión (opcional)</Label>
            <Input
              id="meeting_url"
              type="url"
              value={formData.meeting_url}
              onChange={(e) => setFormData(prev => ({ ...prev, meeting_url: e.target.value }))}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
