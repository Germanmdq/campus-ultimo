import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ThumbsUp, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Reply {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
  replies: Reply[];
  likes: number;
  category: string;
  isLiked: boolean;
  pinned: boolean;
}

export default function ForumPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [newReply, setNewReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data - en la implementación real vendría de Supabase
  const [post, setPost] = useState<ForumPost>({
    id: id || '1',
    title: '🌟 ¡Bienvenidos al Foro de Geometría Sagrada!',
    content: 'Este es el espacio de nuestra comunidad para compartir experiencias, hacer preguntas y aprender juntos sobre los misterios de la geometría sagrada. ¡Siéntanse libres de participar y compartir sus descubrimientos! 📐✨',
    author: 'Carlos Méndez',
    authorRole: 'teacher',
    createdAt: '2025-01-04T10:30:00Z',
    replies: [
      {
        id: '1',
        content: '¡Excelente iniciativa! Estoy muy emocionado por aprender de todos ustedes.',
        author: 'María López',
        authorRole: 'student',
        createdAt: '2025-01-04T10:35:00Z'
      },
      {
        id: '2',
        content: 'Gracias por crear este espacio, Profesor. Tengo muchas preguntas sobre los patrones fractales.',
        author: 'Ana García',
        authorRole: 'student',
        createdAt: '2025-01-04T10:40:00Z'
      }
    ],
    likes: 15,
    category: 'Anuncios',
    isLiked: false,
    pinned: true
  });

  const handleLike = () => {
    setPost(prev => ({
      ...prev,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
      isLiked: !prev.isLiked
    }));
  };

  const handleReply = async () => {
    if (!newReply.trim()) {
      toast({
        title: "Error",
        description: "Por favor escribe una respuesta",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const reply: Reply = {
        id: Date.now().toString(),
        content: newReply,
        author: profile?.full_name || profile?.email || '—',
        authorRole: profile?.role || 'student',
        createdAt: new Date().toISOString()
      };

      setPost(prev => ({
        ...prev,
        replies: [...prev.replies, reply]
      }));
      
      setNewReply('');
      toast({
        title: "Respuesta enviada",
        description: "Tu respuesta ha sido publicada exitosamente",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/comunidad')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al foro
        </Button>
      </div>

      {/* Post Principal */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-accent text-accent-foreground">
                {post.author.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{post.author}</span>
                    <Badge className={getRoleColor(post.authorRole)}>
                      {getRoleLabel(post.authorRole)}
                    </Badge>
                    <Badge variant="outline">{post.category}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-foreground mb-4">{post.content}</p>
              
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-1 ${post.isLiked ? 'text-accent' : ''}`}
                  onClick={handleLike}
                >
                  <ThumbsUp className="h-4 w-4" />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm" className="gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {post.replies.length} respuestas
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Respuestas */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Respuestas ({post.replies.length})
        </h2>
        
        {post.replies.map(reply => (
          <Card key={reply.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {reply.author.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{reply.author}</span>
                    <Badge className={getRoleColor(reply.authorRole)} variant="outline">
                      {getRoleLabel(reply.authorRole)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{reply.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Formulario Nueva Respuesta */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Añadir respuesta</h3>
          <div className="space-y-3">
            <Textarea
              placeholder="Escribe tu respuesta..."
              rows={3}
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleReply} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSubmitting ? 'Enviando...' : 'Responder'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}