import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ThumbsUp, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReplyFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface Reply {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
  files: ReplyFile[];
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Función simplificada para cargar respuestas
  const fetchReplies = async (postId: string) => {
    try {
      
      // Obtener respuestas
      const { data: repliesData, error: repliesError } = await supabase
        .from('forum_post_replies')
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles!forum_post_replies_author_id_fkey (
            full_name,
            role
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (repliesError) {
        console.error('❌ Error fetching replies:', repliesError);
        throw repliesError;
      }


      if (!repliesData || repliesData.length === 0) {
        setPost(prev => ({ ...prev, replies: [] }));
        return;
      }

      // Obtener archivos de todas las respuestas
      const replyIds = repliesData.map((r: any) => r.id);
      
      const { data: filesData, error: filesError } = await supabase
        .from('forum_reply_files' as any)
        .select('*')
        .in('reply_id', replyIds);

      
      if (filesError) {
        console.error('❌ Error fetching files:', filesError);
      }

      // Procesar respuestas con archivos
      const processedReplies = repliesData.map((reply: any) => {
        const replyFiles = filesData?.filter((f: any) => f.reply_id === reply.id) || [];
        
        return {
          id: reply.id,
          content: reply.content,
          author: reply.profiles?.full_name || 'Usuario',
          authorRole: reply.profiles?.role || 'student',
          createdAt: reply.created_at,
          files: replyFiles.map((f: any) => ({
            id: f.id,
            file_url: f.file_url,
            file_name: f.file_name,
            file_type: f.file_type,
            file_size: f.file_size
          }))
        };
      });


      setPost(prev => ({
        ...prev,
        replies: processedReplies
      }));
    } catch (error) {
      console.error('❌ fetchReplies error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las respuestas",
        variant: "destructive",
      });
    }
  };

  // Componente para renderizar archivos adjuntos
  const FileAttachment = ({ file }: { file: ReplyFile }) => {
    if (file.file_type?.startsWith('image/')) {
      return (
        <img 
          src={file.file_url} 
          alt={file.file_name}
          className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setSelectedImage(file.file_url)}
        />
      );
    }
    
    return (
      <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
        📎
      </div>
    );
  };

  // Cargar respuestas al montar el componente
  useEffect(() => {
    if (id) {
      fetchReplies(id);
    }
  }, [id]);

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
        createdAt: '2025-01-04T10:35:00Z',
        files: []
      },
      {
        id: '2',
        content: 'Gracias por crear este espacio, Profesor. Tengo muchas preguntas sobre los patrones fractales.',
        author: 'Ana García',
        authorRole: 'student',
        createdAt: '2025-01-04T10:40:00Z',
        files: []
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

    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para comentar",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('🚀 handleReply - INICIO');
      console.log('🚀 handleReply - postId:', id);
      console.log('🚀 handleReply - profile.id:', profile.id);
      console.log('🚀 handleReply - content:', newReply);

      // 1. Insertar respuesta en la base de datos
      const { data: replyData, error: replyError } = await supabase
        .from('forum_post_replies')
        .insert([{
          post_id: id,
          author_id: profile.id,
          content: newReply
        }])
        .select()
        .single();

      if (replyError) {
        console.error('❌ Error creando reply:', replyError);
        throw replyError;
      }

      console.log('✅ Reply creado:', replyData);

      // 2. Subir archivos si los hay
      if (replyFiles.length > 0) {
        console.log('📁 Subiendo archivos:', replyFiles.length);
        
        for (const file of replyFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `reply-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `forum-files/${fileName}`;

          // Subir archivo a storage
          const { error: uploadError } = await supabase.storage
            .from('forum-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('❌ Error subiendo archivo:', uploadError);
            continue;
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('forum-files')
            .getPublicUrl(filePath);

          console.log('✅ Archivo subido:', publicUrl);

          // Guardar en base de datos
          const { error: dbError } = await supabase
            .from('forum_reply_files' as any)
            .insert([{
              reply_id: replyData.id,
              file_url: publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size
            }]);

          if (dbError) {
            console.error('❌ Error guardando archivo en DB:', dbError);
          } else {
            console.log('✅ Archivo guardado en DB');
          }
        }
      }

      // 3. Recargar respuestas
      console.log('🔄 Recargando respuestas...');
      await fetchReplies(id!);
      
      setNewReply('');
      setReplyFiles([]);
      
      toast({
        title: "Respuesta enviada",
        description: "Tu respuesta ha sido publicada exitosamente",
      });
    } catch (error) {
      console.error('❌ Error adding reply:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la respuesta",
        variant: "destructive",
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
                  <p className="text-sm text-foreground">{reply.content}</p>
                  
                  {/* Mostrar archivos adjuntos de la respuesta */}
                  {reply.files && reply.files.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">Archivos adjuntos:</p>
                      <div className="flex flex-wrap gap-2">
                        {reply.files.map((file: ReplyFile) => (
                          <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                            <FileAttachment file={file} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.file_name}</p>
                              <p className="text-muted-foreground">
                                {(file.file_size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <a 
                              href={file.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              Ver
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
              className="text-foreground placeholder:text-muted-foreground"
            />
            
            {/* Input de archivos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Archivos adjuntos (opcional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setReplyFiles(files);
                }}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {replyFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {replyFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                      <span className="truncate max-w-32">{file.name}</span>
                      <button
                        onClick={() => setReplyFiles(prev => prev.filter((_, i) => i !== index))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
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

      {/* Modal para mostrar imagen ampliada */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Imagen</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Imagen ampliada"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}