import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, MapPin, Users, Loader2, Bell, BellRing } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreateEventForm } from '@/components/admin/CreateEventForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEventNotifications } from '@/hooks/useEventNotifications';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  visibility: 'all' | 'students' | 'teachers';
  meeting_url?: string;
  created_by: string;
}

export default function Calendario() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const { notifications, unreadCount, markAsRead } = useEventNotifications();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin';

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let dataRes = null as any; let errorRes = null as any;
      try {
        // Ocultar eventos pasados: desde el comienzo del día actual
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('end_at', todayStart.toISOString())
          .order('start_at', { ascending: true });
        dataRes = data; errorRes = error;
      } catch (e) { errorRes = e; }

      if (errorRes) {
        // Fallback sin ordenar por columna inexistente (si aplica)
        const { data } = await supabase.from('events').select('*');
        setEvents(data || []);
      } else {
        setEvents(dataRes || []);
      }
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudieron cargar los eventos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = () => {
    setShowCreateEvent(true);
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'students': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'teachers': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'students': return 'Estudiantes';
      case 'teachers': return 'Profesores';
      default: return 'Todos';
    }
  };

  const getFirstUrlFromText = (text?: string) => {
    if (!text) return null;
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendario</h1>
          <p className="text-muted-foreground">
            {isTeacherOrAdmin ? 'Gestiona eventos y fechas importantes' : 'Consulta eventos y fechas importantes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2">
              <BellRing className="h-4 w-4" />
              {unreadCount} nuevas notificaciones
            </Button>
          )}
          {isTeacherOrAdmin && (
            <Button className="gap-2" onClick={handleCreateEvent}>
              <Plus className="h-4 w-4" />
              Nuevo Evento
            </Button>
          )}
        </div>
      </div>

      {/* Notificaciones recientes */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 3).map((notification) => (
              <div 
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  notification.read_at ? 'bg-muted/30' : 'bg-accent/10 border-accent/30'
                }`}
                onClick={() => !notification.read_at && markAsRead(notification.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{notification.event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEventDate(notification.event.start_at)} a las {formatEventTime(notification.event.start_at)}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos eventos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay eventos programados</p>
                {isTeacherOrAdmin && (
                  <p className="text-sm mt-2">Crea tu primer evento usando el botón "Nuevo Evento"</p>
                )}
              </div>
            ) : (
              events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-surface/50 cursor-pointer"
                  onClick={() => { setSelectedEvent(event); setDetailsOpen(true); }}>
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatEventDate(event.start_at)} - {formatEventTime(event.start_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getVisibilityColor(event.visibility)}>
                        {getVisibilityLabel(event.visibility)}
                      </Badge>
                      {event.meeting_url && (
                        <Button 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(event.meeting_url, '_blank');
                          }}
                        >
                          Ingresar
                        </Button>
                      )}
                      {!event.meeting_url && getFirstUrlFromText(event.description) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = getFirstUrlFromText(event.description)!;
                            window.open(url, '_blank');
                          }}
                        >
                          Abrir enlace
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Vista de calendario simplificada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {(() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = now.getMonth();
                const first = new Date(y, m, 1);
                const firstWeekday = first.getDay(); // 0-6
                const daysInMonth = new Date(y, m + 1, 0).getDate();
                const cells = 42; // 6 semanas
                const items: Array<number | null> = [];
                for (let i = 0; i < firstWeekday; i++) items.push(null);
                for (let d = 1; d <= daysInMonth; d++) items.push(d);
                while (items.length < cells) items.push(null);

                const isToday = (d: number) => d === now.getDate();
                const hasEventOn = (d: number) => events.some(e => {
                  const sd = new Date(e.start_at);
                  return sd.getFullYear() === y && sd.getMonth() === m && sd.getDate() === d;
                });

                return items.map((d, idx) => {
                  const isCurrentMonth = d !== null;
                  const eventFlag = d ? hasEventOn(d) : false;
                  const todayFlag = d ? isToday(d) : false;
                  return (
                    <div
                      key={idx}
                      className={`
                        p-2 h-10 text-center text-sm rounded-lg
                        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                        ${isCurrentMonth ? 'hover:bg-muted/40' : ''}
                        ${todayFlag ? 'ring-1 ring-accent' : ''}
                        ${eventFlag ? 'bg-red-500/10 ring-1 ring-red-400' : ''}
                      `}
                    >
                      {isCurrentMonth ? d : ''}
                      {eventFlag && (
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mx-auto mt-1"></div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas del mes */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-2">{events.length}</p>
            <p className="text-xs text-muted-foreground">Eventos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Campus</span>
            </div>
            <p className="text-2xl font-bold mt-2">{events.filter(e => e.visibility === 'all').length}</p>
            <p className="text-xs text-muted-foreground">Para todos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Estudiantes</span>
            </div>
            <p className="text-2xl font-bold mt-2">{events.filter(e => e.visibility === 'students').length}</p>
            <p className="text-xs text-muted-foreground">Solo estudiantes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Notificaciones</span>
            </div>
            <p className="text-2xl font-bold mt-2">{unreadCount}</p>
            <p className="text-xs text-muted-foreground">Sin leer</p>
          </CardContent>
        </Card>
      </div>

      <CreateEventForm 
        open={showCreateEvent} 
        onOpenChange={setShowCreateEvent}
        onSuccess={fetchEvents}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {formatEventDate(selectedEvent?.start_at || '')} {selectedEvent && '·'} {formatEventTime(selectedEvent?.start_at || '')}
            </div>
            {selectedEvent?.description && (
              <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
            )}
            {(selectedEvent?.meeting_url || getFirstUrlFromText(selectedEvent?.description)) && (
              <div className="pt-2">
                <Button onClick={() => window.open(selectedEvent?.meeting_url || getFirstUrlFromText(selectedEvent?.description)!, '_blank')}>
                  Abrir enlace
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}