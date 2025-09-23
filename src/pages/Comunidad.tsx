import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Plus, Search, Heart, MessageCircle, Pin, Loader2, Edit, Trash2, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ForumFileUpload from '@/components/ui/forum-file-upload';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category?: string;
  pinned: boolean;
  created_at: string;
  author_id: string;
  forum_id?: string;
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean;
  author_name?: string;
  author_role?: string;
  files?: ForumPostFile[];
}

interface ForumPostFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
}

interface Forum {
  id: string;
  name: string;
  description?: string;
  program_id: string;
  program?: {
    title: string;
  };
}

interface Program {
  id: string;
  title: string;
}

export default function Comunidad() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [forums, setForums] = useState<Forum[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateForumDialog, setShowCreateForumDialog] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: '',
    forum_id: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newForum, setNewForum] = useState({
    name: '',
    description: '',
    program_ids: [] as string[]
  });
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [showEditForum, setShowEditForum] = useState(false);
  const [showReplies, setShowReplies] = useState<{ [postId: string]: boolean }>({});
  const [newReply, setNewReply] = useState<{ [postId: string]: string }>({});
  const [replies, setReplies] = useState<{ [postId: string]: any[] }>({});
  const [replyFiles, setReplyFiles] = useState<{ [postId: string]: File[] }>({});

  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    fetchPosts();
    fetchForums();
    fetchPrograms();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          content,
          category,
          pinned,
          created_at,
          author_id,
          forum_id,
          profiles!forum_posts_author_id_fkey (
            full_name,
            role
          ),
          forum_post_likes (
            id,
            user_id
          ),
          forum_post_replies (
            id
          ),
          forum_post_files (
            id,
            file_url,
            file_name,
            file_type,
            file_size
          )
        `)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
      
      // Filtrar posts que tienen autor válido (limpiar datos huérfanos)
      const validPosts = (data || []).filter((post: any) => post.profiles);
      
      // Procesar los datos para incluir conteos y estado de like
      const processedPosts = validPosts.map((post: any) => ({
        ...post,
        author_name: post.profiles?.full_name || 'Usuario',
        author_role: post.profiles?.role || 'student',
        likes_count: post.forum_post_likes?.length || 0,
        replies_count: post.forum_post_replies?.length || 0,
        is_liked: user ? post.forum_post_likes?.some((like: any) => like.user_id === user.id) : false,
        files: post.forum_post_files || []
      }));
      
      setPosts(processedPosts);
    } catch (error: any) {
      console.error('Error in fetchPosts:', error);
      toast({
        title: "Error", 
        description: "No se pudieron cargar las publicaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchForums = async () => {
    try {
      const { data, error } = await supabase
      .from('forums')
      .select(`
        id,
        name,
        description,
        program_id,
        programs (title)
      `)
      .order('name');
    
      if (error) {
        console.error('Error fetching forums:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los foros",
          variant: "destructive",
        });
        return;
      }
    
    setForums(data || []);
    } catch (error) {
      console.error('Error in fetchForums:', error);
      toast({
        title: "Error",
        description: "Error al cargar los foros",
        variant: "destructive",
      });
    }
  };

  const fetchPrograms = async () => {
    const { data } = await supabase
      .from('programs')
      .select('id, title')
      .not('published_at', 'is', null)
      .order('title');
    
    setPrograms(data || []);
  };

  // Función para manejar cambios en archivos del componente ForumFileUpload
  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  // Función para manejar cambios en archivos de respuestas
  const handleReplyFilesChange = (postId: string, files: File[]) => {
    setReplyFiles(prev => ({
      ...prev,
      [postId]: files
    }));
  };

  // Función simplificada para subir archivos usando el bucket forum-files
  const uploadFiles = async (postId: string) => {
    if (selectedFiles.length === 0) return [];

    setUploadingFiles(true);
    const uploadedFiles = [];

    try {
      // Verificar que el bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.warn('No se pudieron listar buckets:', bucketsError);
      }

      const forumFilesBucket = buckets?.find(b => b.id === 'forum-files');
      if (!forumFilesBucket) {
        console.log('🪣 Bucket forum-files no existe, intentando crear...');
        
        // Intentar crear el bucket
        const { error: createError } = await supabase.storage.createBucket('forum-files', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
            'application/pdf', 'text/plain', 'text/csv',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'video/mp4', 'video/avi', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg'
          ]
        });

        if (createError) {
          console.error('Error creando bucket:', createError);
          toast({
            title: "🪣 Error creando bucket",
            description: "No se pudo crear el bucket 'forum-files'. Contacta al administrador.",
            variant: "destructive",
          });
          return [];
        }

        console.log('✅ Bucket forum-files creado exitosamente');
        toast({
          title: "✅ Bucket creado",
          description: "El bucket 'forum-files' fue creado automáticamente",
        });
      }

      for (const file of selectedFiles) {
        try {
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
          const fileName = `forum-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `forum-files/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('forum-files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('forum-files')
            .getPublicUrl(filePath);

          const { error: dbError } = await supabase
            .from('forum_post_files')
            .insert([{
              post_id: postId,
              file_url: publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size
            }]);

          if (dbError) throw dbError;

          uploadedFiles.push({
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "Error subiendo archivo",
            description: `No se pudo subir ${file.name}`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error in uploadFiles:', error);
    } finally {
      setUploadingFiles(false);
    }

    return uploadedFiles;
  };

  // Función para subir archivos de respuestas
  const uploadReplyFiles = async (postId: string) => {
    const files = replyFiles[postId] || [];
    if (files.length === 0) return [];

    const uploadedFiles = [];

    try {
      // Verificar que el bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.warn('No se pudieron listar buckets:', bucketsError);
      }

      const forumFilesBucket = buckets?.find(b => b.id === 'forum-files');
      if (!forumFilesBucket) {
        console.log('🪣 Bucket forum-files no existe, intentando crear...');
        
        // Intentar crear el bucket
        const { error: createError } = await supabase.storage.createBucket('forum-files', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
            'application/pdf', 'text/plain', 'text/csv',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'video/mp4', 'video/avi', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg'
          ]
        });

        if (createError) {
          console.error('Error creando bucket:', createError);
          toast({
            title: "🪣 Error creando bucket",
            description: "No se pudo crear el bucket 'forum-files'. Contacta al administrador.",
            variant: "destructive",
          });
          return [];
        }

        console.log('✅ Bucket forum-files creado exitosamente');
        toast({
          title: "✅ Bucket creado",
          description: "El bucket 'forum-files' fue creado automáticamente",
        });
      }

      for (const file of files) {
        try {
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
          const fileName = `reply-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `forum-files/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('forum-files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('forum-files')
            .getPublicUrl(filePath);

          uploadedFiles.push({
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size
          });
        } catch (error) {
          console.error('Error uploading reply file:', error);
          toast({
            title: "Error subiendo archivo",
            description: `No se pudo subir ${file.name}`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error in uploadReplyFiles:', error);
    }

    return uploadedFiles;
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({
        title: "Error",
        description: "Título y contenido son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para crear una publicación",
        variant: "destructive",
      });
      return;
    }

    try {
      const postData = {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        category: newPost.category || null,
        forum_id: newPost.forum_id === 'none' ? null : newPost.forum_id || null,
        author_id: user.id,
        pinned: false
      };

      const { data, error } = await supabase
        .from('forum_posts')
        .insert([postData])
        .select('*');

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      // Subir archivos si hay alguno
      if (selectedFiles.length > 0) {
        await uploadFiles(data[0].id);
      }

      // Mostrar el foro asociado en el toast si existe
      const forumName = newPost.forum_id ? 
        forums.find(f => f.id === newPost.forum_id)?.name : null;

      toast({
        title: "Publicación creada",
        description: forumName ? 
          `Tu publicación en "${forumName}" ha sido creada` :
          "Tu publicación ha sido creada exitosamente",
      });

      setNewPost({ title: '', content: '', category: '', forum_id: '' });
      setSelectedFiles([]);
      setShowCreateDialog(false);
      fetchPosts();
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Error",
        description: `No se pudo crear la publicación: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleCreateForum = async () => {
    if (!newForum.name.trim() || newForum.program_ids.length === 0) {
      toast({
        title: "Error",
        description: "Nombre del foro y al menos un programa son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Crear un foro por cada programa seleccionado
      const forumsToCreate = newForum.program_ids.map(program_id => ({
          name: newForum.name.trim(),
          description: newForum.description.trim() || null,
        program_id: program_id
      }));

      const { error } = await supabase
        .from('forums')
        .insert(forumsToCreate);

      if (error) throw error;

      toast({
        title: "Foro creado",
        description: `El foro "${newForum.name}" ha sido creado para ${newForum.program_ids.length} programa(s)`,
      });

      setNewForum({ name: '', description: '', program_ids: [] });
      setShowCreateForumDialog(false);
      fetchForums();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo crear el foro: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleEditForum = (forum: Forum) => {
    setEditingForum(forum);
    setNewForum({
      name: forum.name,
      description: forum.description || '',
      program_ids: [forum.program_id]
    });
    setShowEditForum(true);
  };

  const handleUpdateForum = async () => {
    if (!editingForum || !newForum.name.trim() || newForum.program_ids.length === 0) {
      toast({
        title: "Error",
        description: "Nombre del foro y al menos un programa son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('forums')
        .update({
          name: newForum.name.trim(),
          description: newForum.description.trim() || null,
          program_id: newForum.program_ids[0]
        })
        .eq('id', editingForum.id);

      if (error) throw error;

      toast({
        title: "Foro actualizado",
        description: `El foro "${newForum.name}" ha sido actualizado exitosamente`,
      });

      setNewForum({ name: '', description: '', program_ids: [] });
      setEditingForum(null);
      setShowEditForum(false);
      fetchForums();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo actualizar el foro: ${error.message}`,
        variant: "destructive",
      });
    }
  };


  const handleDeleteForum = async (forum: Forum) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el foro "${forum.name}"? Esta acción eliminará también todos los posts del foro y no se puede deshacer.`)) {
      return;
    }

    try {
      // 1. Primero eliminar todos los posts del foro (esto eliminará automáticamente likes, replies y files por CASCADE)
      const { error: postsError } = await supabase
        .from('forum_posts')
        .delete()
        .eq('forum_id', forum.id);

      if (postsError) throw postsError;

      // 2. Luego eliminar el foro
      const { error: forumError } = await supabase
        .from('forums')
        .delete()
        .eq('id', forum.id);

      if (forumError) throw forumError;

      toast({
        title: "Foro eliminado",
        description: `El foro "${forum.name}" y todos sus posts han sido eliminados exitosamente`,
      });

      // Actualizar las listas
      fetchForums();
      fetchPosts();
    } catch (error: any) {
      console.error('Error deleting forum:', error);
      toast({
        title: "Error",
        description: `No se pudo eliminar el foro: ${error.message}`,
        variant: "destructive",
      });
    }
  };



  const handleLikePost = async (postId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para dar like",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verificar si ya le dio like
      const { data: existingLike } = await supabase
        .from('forum_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Quitar like
        const { error } = await supabase
          .from('forum_post_likes')
          .delete()
          .eq('id', existingLike.id);
        
        if (error) throw error;
      } else {
        // Agregar like
        const { error } = await supabase
          .from('forum_post_likes')
          .insert([{
            post_id: postId,
            user_id: user.id
          }]);
        
        if (error) throw error;
      }

      fetchPosts();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el like",
        variant: "destructive",
      });
    }
  };

  const fetchReplies = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_post_replies')
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles!forum_post_replies_author_id_fkey (
            full_name,
            role
          ),
          forum_reply_files (
            id,
            file_url,
            file_name,
            file_type,
            file_size
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filtrar comentarios que tienen autor válido (limpiar datos huérfanos)
      const validReplies = (data || []).filter((reply: any) => reply.profiles);
      
      const processedReplies = validReplies.map((reply: any) => ({
        ...reply,
        author_name: reply.profiles?.full_name || 'Usuario',
        author_role: reply.profiles?.role || 'student',
        files: reply.forum_reply_files || []
      }));

      setReplies(prev => ({
        ...prev,
        [postId]: processedReplies
      }));
    } catch (error: any) {
      console.error('Error fetching replies:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los comentarios",
        variant: "destructive",
      });
    }
  };

  const handleAddReply = async (postId: string) => {
    const replyContent = newReply[postId]?.trim();
    if (!replyContent) {
      toast({
        title: "Error",
        description: "Por favor escribe un comentario",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para comentar",
        variant: "destructive",
      });
      return;
    }

    try {
      // Crear la respuesta
      const { data: replyData, error: replyError } = await supabase
        .from('forum_post_replies')
        .insert([{
          post_id: postId,
          author_id: user.id,
          content: replyContent
        }])
        .select()
        .single();

      if (replyError) throw replyError;

      // Subir archivos si hay alguno
      const files = replyFiles[postId] || [];
      if (files.length > 0) {
        const uploadedFiles = await uploadReplyFiles(postId);
        
        // Guardar archivos en la base de datos (tabla de archivos de respuestas)
        if (uploadedFiles.length > 0) {
          const { error: filesError } = await supabase
            .from('forum_reply_files')
            .insert(uploadedFiles.map(file => ({
              reply_id: replyData.id,
              file_url: file.file_url,
              file_name: file.file_name,
              file_type: file.file_type,
              file_size: file.file_size
            })));

          if (filesError) {
            console.error('Error saving reply files:', filesError);
          }
        }
      }

      setNewReply(prev => ({
        ...prev,
        [postId]: ''
      }));

      // Limpiar archivos de la respuesta
      setReplyFiles(prev => ({
        ...prev,
        [postId]: []
      }));

      // Actualizar comentarios y conteo de posts
      fetchReplies(postId);
      fetchPosts();
      
      toast({
        title: "Comentario agregado",
        description: "Tu comentario ha sido publicado",
      });
    } catch (error: any) {
      console.error('Error adding reply:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive",
      });
    }
  };

  const toggleReplies = (postId: string) => {
    setShowReplies(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));

    // Cargar comentarios si no están cargados
    if (!replies[postId]) {
      fetchReplies(postId);
    }
  };

  const filteredPosts = posts.filter(post => {
    // Filtrar posts huérfanos (sin autor válido)
    if (!post.author_name || post.author_name === 'Sin nombre') {
      return false;
    }
    
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'todos' || post.category === filterCategory;
    const matchesForum = !selectedForumId || post.forum_id === selectedForumId;
    
    return matchesSearch && matchesCategory && matchesForum;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Fecha inválida';
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comunidad</h1>
          <p className="text-muted-foreground">
            Conecta con otros estudiantes y profesores
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateForumDialog} onOpenChange={setShowCreateForumDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Foro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="forumName">Nombre del Foro</Label>
                  <Input
                    id="forumName"
                    value={newForum.name}
                    onChange={(e) => setNewForum({ ...newForum, name: e.target.value })}
                    placeholder="Nombre del foro"
                  />
                </div>

                <div>
                  <Label htmlFor="forumDescription">Descripción</Label>
                  <Textarea
                    id="forumDescription"
                    value={newForum.description}
                    onChange={(e) => setNewForum({ ...newForum, description: e.target.value })}
                    placeholder="Descripción del foro"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Programas</Label>
                  <div className="space-y-2 mt-2">
                      {programs.map(program => (
                      <div key={program.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`create-program-${program.id}`}
                          checked={newForum.program_ids.includes(program.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewForum({
                                ...newForum,
                                program_ids: [...newForum.program_ids, program.id]
                              });
                            } else {
                              setNewForum({
                                ...newForum,
                                program_ids: newForum.program_ids.filter(id => id !== program.id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`create-program-${program.id}`} className="text-sm font-normal">
                          {program.title}
                        </Label>
                      </div>
                      ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateForum} className="flex-1">
                    Crear Foro
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForumDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Publicación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nueva Publicación</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="Título de tu publicación"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={newPost.category} onValueChange={(value) => setNewPost({ ...newPost, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="pregunta">Pregunta</SelectItem>
                      <SelectItem value="discusion">Discusión</SelectItem>
                      <SelectItem value="anuncio">Anuncio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="forum">Foro</Label>
                  <Select value={newPost.forum_id} onValueChange={(value) => setNewPost({ ...newPost, forum_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿En qué foro quieres publicar?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General (sin foro específico)</SelectItem>
                      {forums.map(forum => (
                        <SelectItem key={forum.id} value={forum.id}>
                          {forum.name} - {forum.program?.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="content">Contenido</Label>
                  <Textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder="Comparte tus ideas, preguntas o comentarios..."
                    rows={5}
                  />
                </div>

                <div>
                  <ForumFileUpload
                    onFilesChange={handleFilesChange}
                    maxFiles={5}
                    maxSizePerFile={10}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreatePost} 
                    className="flex-1"
                    disabled={uploadingFiles}
                  >
                    {uploadingFiles ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Subiendo archivos...
                      </>
                    ) : (
                      'Publicar'
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Crear Foro - Primera caja */}
      {isTeacherOrAdmin && (
        <Card className="border-2 border-dashed border-muted-foreground/25">
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Crear Nuevo Foro</h3>
            <p className="text-muted-foreground mb-4">
              Crea un espacio de discusión para un programa específico
            </p>
            <Button onClick={() => setShowCreateForumDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Foro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Foros existentes y sus publicaciones */}
      {forums.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Foros Activos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {forums.map(forum => {
                const forumPosts = posts.filter(post => post.forum_id === forum.id);
                const totalPosts = forumPosts.length;
                return (
                  <Card key={forum.id} className={`border hover:shadow-md transition-all cursor-pointer ${
                    selectedForumId === forum.id ? 'border-accent bg-accent/5' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{forum.name}</h4>
                        <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                            {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
                        </Badge>
                          {isTeacherOrAdmin && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditForum(forum);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteForum(forum);
                                }}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {forum.description && (
                        <p className="text-sm text-muted-foreground mb-2">{forum.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {forum.program?.title}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant={selectedForumId === forum.id ? "default" : "ghost"}
                          className="text-xs"
                          onClick={() => {
                            if (selectedForumId === forum.id) {
                              setSelectedForumId(null);
                              toast({
                                title: "Vista general",
                                description: "Mostrando todas las publicaciones",
                              });
                            } else {
                              setSelectedForumId(forum.id);
                              setSearchTerm('');
                              setFilterCategory('todos');
                              toast({
                                title: "Foro seleccionado",
                                description: `Mostrando mensajes de: ${forum.name}`,
                              });
                            }
                          }}
                        >
                          {selectedForumId === forum.id ? 'Ocultar mensajes' : 'Ver mensajes'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar publicaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="pregunta">Preguntas</SelectItem>
                <SelectItem value="discusion">Discusiones</SelectItem>
                <SelectItem value="anuncio">Anuncios</SelectItem>
              </SelectContent>
            </Select>
            {selectedForumId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedForumId(null);
                  toast({
                    title: "Filtro removido",
                    description: "Mostrando todas las publicaciones",
                  });
                }}
              >
                Mostrar todos
              </Button>
            )}
          </div>
          {selectedForumId && (
            <div className="mt-2">
              <Badge variant="secondary">
                Mostrando: {forums.find(f => f.id === selectedForumId)?.name || 'Foro seleccionado'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Publicaciones */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No hay publicaciones</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterCategory !== 'todos' 
                  ? 'No se encontraron publicaciones con los filtros actuales'
                  : 'Sé el primero en crear una publicación en la comunidad'
                }
              </p>
              {!searchTerm && filterCategory === 'todos' && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  Crear Publicación
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map(post => (
            <Card key={post.id} className={post.pinned ? "border-accent" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      AU
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.pinned && (
                          <Pin className="h-4 w-4 text-accent" />
                        )}
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {post.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-muted-foreground">
                        por {post.author_name || 'Usuario'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {post.author_role === 'teacher' ? 'Profesor' : 
                         post.author_role === 'admin' ? 'Admin' : 'Estudiante'}
                      </Badge>
                      {post.category && (
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-foreground mb-4 line-clamp-3">
                      {post.content}
                    </p>
                    
                    {/* Mostrar archivos adjuntos */}
                    {post.files && post.files.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Archivos adjuntos:</p>
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                          {post.files.map((file: ForumPostFile) => (
                            <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{file.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(file.file_url, '_blank')}
                                className="h-6 w-6 p-0"
                              >
                                ↗
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikePost(post.id)}
                        className={`gap-1 ${post.is_liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                        <span>{post.likes_count || 0}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleReplies(post.id)}
                        className="gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.replies_count || 0}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {/* Sección de comentarios */}
              {showReplies[post.id] && (
                <div className="border-t bg-muted/30 p-4">
                  <div className="space-y-4">
                    {/* Lista de comentarios */}
                    {replies[post.id]?.map((reply: any) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                            {reply.author_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{reply.author_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {reply.author_role === 'teacher' ? 'Profesor' : 
                               reply.author_role === 'admin' ? 'Admin' : 'Estudiante'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{reply.content}</p>
                          
                          {/* Mostrar archivos adjuntos de la respuesta */}
                          {reply.files && reply.files.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <p className="text-xs text-muted-foreground">Archivos adjuntos:</p>
                              <div className="flex flex-wrap gap-2">
                                {reply.files.map((file: any) => (
                                  <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                                    {file.file_type.startsWith('image/') ? (
                                      <img 
                                        src={file.file_url} 
                                        alt={file.file_name}
                                        className="w-8 h-8 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
                                        📎
                                      </div>
                                    )}
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
                    ))}
                    
                    {/* Formulario para nuevo comentario */}
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                          {profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Escribe un comentario..."
                          value={newReply[post.id] || ''}
                          onChange={(e) => setNewReply(prev => ({
                            ...prev,
                            [post.id]: e.target.value
                          }))}
                          className="min-h-[60px]"
                        />
                        
                        {/* Componente de subida de archivos para respuestas */}
                        <ForumFileUpload
                          onFilesChange={(files) => handleReplyFilesChange(post.id, files)}
                          maxFiles={3}
                          maxSizePerFile={5}
                        />
                        
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleAddReply(post.id)}
                            disabled={!newReply[post.id]?.trim()}
                          >
                            Comentar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Dialog para editar foro */}
      <Dialog open={showEditForum} onOpenChange={setShowEditForum}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Foro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-forum-name">Nombre del Foro</Label>
              <Input
                id="edit-forum-name"
                value={newForum.name}
                onChange={(e) => setNewForum({ ...newForum, name: e.target.value })}
                placeholder="Nombre del foro"
              />
            </div>

            <div>
              <Label htmlFor="edit-forum-description">Descripción (opcional)</Label>
              <Textarea
                id="edit-forum-description"
                value={newForum.description}
                onChange={(e) => setNewForum({ ...newForum, description: e.target.value })}
                placeholder="Descripción del foro"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-forum-program">Programa</Label>
              <Select 
                value={newForum.program_ids[0] || ''} 
                onValueChange={(value) => setNewForum({ ...newForum, program_ids: [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un programa" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdateForum} className="flex-1">
                Actualizar Foro
              </Button>
              <Button variant="outline" onClick={() => setShowEditForum(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}