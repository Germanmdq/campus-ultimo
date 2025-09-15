import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Send, Search, Plus, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

interface Conversation {
  id: string;
  other_user: Profile;
  last_message?: Message;
  unread_count: number;
}

export default function Mensajes() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchAvailableUsers();
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages();
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Get unique user IDs from messages
      const userIds = new Set<string>();
      messages?.forEach(message => {
        if (message.sender_id !== user.id) userIds.add(message.sender_id);
        if (message.receiver_id !== user.id) userIds.add(message.receiver_id);
      });

      // Fetch profiles for those users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', Array.from(userIds));

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Agrupar mensajes por conversación
      const conversationMap = new Map();
      
      messages?.forEach(message => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        const otherUser = profilesMap.get(otherUserId);
        
        if (otherUser && !conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            other_user: otherUser,
            last_message: message,
            unread_count: 0
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .neq('id', user?.id || '')
        .order('full_name');
      
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    if (!activeConversation || !user) return;

    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeConversation}),and(sender_id.eq.${activeConversation},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          content: newMessage.trim(),
          sender_id: user.id,
          receiver_id: activeConversation
        }]);

      if (error) throw error;

      setNewMessage('');
      fetchMessages();
      fetchConversations(); // Actualizar la lista de conversaciones
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    }
  };

  const handleStartConversation = async () => {
    if (!selectedUser || !user) return;

    setActiveConversation(selectedUser);
    setShowNewConversation(false);
    setSelectedUser('');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'teacher': return 'Profesor';
      case 'admin': return 'Admin';
      default: return 'Estudiante';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const activeUser = conversations.find(c => c.id === activeConversation)?.other_user;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mensajes</h1>
          <p className="text-muted-foreground">Comunícate directamente con profesores y estudiantes</p>
        </div>
        <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Mensaje
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Conversación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Buscar usuario</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableUsers
                  .filter(user => 
                    user.full_name.toLowerCase().includes(searchUsers.toLowerCase())
                  )
                  .map(user => (
                    <div 
                      key={user.id}
                      className={`p-3 rounded-lg cursor-pointer border hover:bg-muted/50 ${
                        selectedUser === user.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedUser(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleStartConversation}
                  disabled={!selectedUser}
                  className="flex-1"
                >
                  Iniciar Conversación
                </Button>
                <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground p-4">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay conversaciones</p>
                <p className="text-sm mt-2">Inicia una conversación con otros usuarios</p>
              </div>
            ) : (
              conversations.map(conversation => (
                <div 
                  key={conversation.id} 
                  className={`p-4 cursor-pointer border-b hover:bg-muted/50 ${
                    activeConversation === conversation.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(conversation.other_user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm truncate">{conversation.other_user.full_name}</h4>
                        {conversation.last_message && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <Badge className={`text-xs ${getRoleColor(conversation.other_user.role)} mb-1`}>
                        {getRoleLabel(conversation.other_user.role)}
                      </Badge>
                      {conversation.last_message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {activeUser ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(activeUser.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span>{activeUser.full_name}</span>
                    <Badge className={`ml-2 text-xs ${getRoleColor(activeUser.role)}`}>
                      {getRoleLabel(activeUser.role)}
                    </Badge>
                  </div>
                </div>
              ) : (
                'Selecciona una conversación'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!activeConversation ? (
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Selecciona una conversación para comenzar</p>
                </div>
              </div>
            ) : (
              <>
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.map(message => (
                    <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs p-3 rounded-lg ${
                        message.sender_id === user?.id 
                          ? 'bg-accent text-accent-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{formatTime(message.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground">
                      <p>No hay mensajes aún</p>
                      <p className="text-sm">¡Envía el primer mensaje!</p>
                    </div>
                  )}
                </div>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Escribe tu mensaje..." 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={2} 
                      className="flex-1" 
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}