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
import { uploadFiles as uploadReplyFilesFromComponent } from '@/components/ui/forum-file-upload';
import { uploadNestedFiles } from '@/components/ui/forum-nested-file-upload';

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
  // Vercel deploy test - reply files display fix
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
  
  // Estado para el modal de imagen
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
  
  // Estados para comentarios anidados estilo chat
  const [nestedReplyContent, setNestedReplyContent] = useState<{[key: string]: string}>({});
  const [nestedReplyFiles, setNestedReplyFiles] = useState<{[key: string]: File[]}>({});
  const [showNestedForm, setShowNestedForm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyFiles, setReplyFiles] = useState<{ [postId: string]: File[] }>({});

  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin';

  // Componente mejorado para renderizar archivos adjuntos
  const EnhancedFileAttachment = ({ file, onImageClick }: { file: any; onImageClick?: (url: string) => void }) => {
    const isImage = file.file_type?.startsWith('image/');
    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    if (isImage) {
      return (
        <div className="group relative">
          <div 
            className="relative overflow-hidden rounded-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => onImageClick?.(file.file_url)}
          >
            <img 
              src={file.file_url} 
              alt={file.file_name}
              className="w-full h-32 object-cover"
              loading="lazy"
            />
            {/* Overlay con información */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end">
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <p className="text-white text-xs font-medium truncate">{file.file_name}</p>
                <p className="text-white/80 text-xs">{formatFileSize(file.file_size)}</p>
              </div>
            </div>
            {/* Icono de zoom */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-white/90 rounded-full p-1">
                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Para archivos no-imagen
    const getFileIcon = (type: string) => {
      if (type.includes('pdf')) return '📄';
      if (type.includes('document') || type.includes('word')) return '📝';
      if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
      if (type.includes('presentation') || type.includes('powerpoint')) return '📈';
      if (type.includes('video')) return '🎥';
      if (type.includes('audio')) return '🎵';
      if (type.includes('zip') || type.includes('rar')) return '🗜️';
      return '📎';
    };

    return (
      <div className="bg-muted/50 hover:bg-muted transition-colors duration-200 rounded-lg p-3 border border-border/50 hover:border-border cursor-pointer group">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getFileIcon(file.file_type)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {file.file_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.file_size)}
            </p>
          </div>
          <a 
            href={file.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Abrir
          </a>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchPosts();
    fetchForums();
    fetchPrograms();
  }, []);

  // Hook para manejar ESC en el modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      if (!user) {
        console.log('No user logged in, skipping posts fetch');
        setPosts([]);
        setLoading(false);
        return;
      }

      // TODOS los usuarios autenticados pueden ver TODOS los posts
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
            profiles (
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
      if (!user) {
        console.log('No user logged in, skipping forums fetch');
        return;
      }

      // Obtener el rol del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role as string;

      // Si es admin, formador o voluntario, mostrar TODOS los foros
      if (userRole === 'admin' || userRole === 'formador' || userRole === 'voluntario') {
        
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
        return;
      }

      // Si es estudiante, mostrar solo foros de sus programas
      
      // Obtener los programas del usuario
      const { data: userPrograms, error: userProgramsError } = await supabase
        .from('enrollments')
        .select('program_id')
        .eq('user_id', user.id);

      if (userProgramsError) {
        console.error('Error fetching user programs:', userProgramsError);
        toast({
          title: "Error",
          description: "No se pudieron cargar los programas del usuario",
          variant: "destructive",
        });
        return;
      }

      if (!userPrograms || userPrograms.length === 0) {
        console.log('User not enrolled in any programs');
        setForums([]);
        return;
      }

      // Obtener los IDs de los programas del usuario
      const programIds = userPrograms.map(up => up.program_id);

      // Cargar foros solo de los programas del usuario
      const { data, error } = await supabase
        .from('forums')
        .select(`
          id,
          name,
          description,
          program_id,
          programs (title)
        `)
        .in('program_id', programIds)
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

  // Subida de archivos de POST (no replies)
  const uploadPostFiles = async (postId: string) => {
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
        console.log('📤 Bucket forum-files ya existe, procediendo con subida...');

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
        console.log('📤 Bucket forum-files ya existe, procediendo con subida...');

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
        await uploadPostFiles(data[0].id);
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
      console.log('🔍 fetchReplies - postId:', postId);
      
      // Primero obtener las respuestas
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
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      console.log('🔍 fetchReplies - data:', data);
      console.log('🔍 fetchReplies - error:', error);

      if (error) throw error;

      // Filtrar comentarios que tienen autor válido
      const validReplies = (data || []).filter((reply: any) => reply.profiles);
      
      if (validReplies.length === 0) {
        setReplies(prev => ({ ...prev, [postId]: [] }));
        return;
      }

      // Obtener los archivos por separado
      const replyIds = validReplies.map((r: any) => r.id);
      console.log('🔍 fetchReplies - replyIds:', replyIds);
      
      const { data: filesData, error: filesError } = await supabase
        .from('forum_reply_files' as any)
        .select('*')
        .in('reply_id', replyIds);

      console.log('🔍 fetchReplies - filesData:', filesData);
      console.log('🔍 fetchReplies - filesError:', filesError);

      if (filesError) {
        console.error('Error fetching files:', filesError);
      }

      // Combinar respuestas con sus archivos
      const processedReplies = validReplies.map((reply: any) => {
        const replyFiles = filesData?.filter((f: any) => f.reply_id === reply.id) || [];
        
        return {
          id: reply.id,
          content: reply.content,
        author_name: reply.profiles?.full_name || 'Usuario',
        author_role: reply.profiles?.role || 'student',
          created_at: reply.created_at,
          files: replyFiles.map((f: any) => ({
            id: f.id,
            file_url: f.file_url,
            file_name: f.file_name,
            file_type: f.file_type,
            file_size: f.file_size
          }))
        };
      });

      console.log('🔍 fetchReplies - processedReplies:', processedReplies);

      setReplies(prev => ({
        ...prev,
        [postId]: processedReplies
      }));
    } catch (error: any) {
      console.error('❌ fetchReplies error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los comentarios",
        variant: "destructive",
      });
    }
  };

  // Función de debug para verificar archivos en DB
  const debugReplyFiles = async (replyId: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_reply_files' as any)
        .select('*')
        .eq('reply_id', replyId);
        
      console.log('🔍 Debug - Archivos en DB para reply', replyId, ':', data);
      if (error) console.error('🔍 Debug - Error:', error);
      return data;
    } catch (error) {
      console.error('🔍 Debug - Error en debugReplyFiles:', error);
      return null;
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
      console.log('🚀 handleAddReply - INICIO');
      console.log('🚀 handleAddReply - postId:', postId);
      console.log('🚀 handleAddReply - user.id:', user.id);
      console.log('🚀 handleAddReply - content:', replyContent);

      // 1. Crear la respuesta primero
      const { data: replyData, error: replyError } = await supabase
        .from('forum_post_replies')
        .insert([{
          post_id: postId,
          author_id: user.id,
          content: replyContent
        }])
        .select()
        .single();

      if (replyError) {
        console.error('❌ Error creando reply:', replyError);
        throw replyError;
      }

      console.log('✅ Reply creado:', replyData);
      console.log('🚀 handleAddReply - replyData.id:', replyData.id);

      // 2. Subir archivos si hay alguno
      const files = replyFiles[postId] || [];
      console.log('🚀 handleAddReply - files:', files);
      console.log('🚀 handleAddReply - tipo de files:', typeof files);
      console.log('🚀 handleAddReply - es array?:', Array.isArray(files));
      console.log('🚀 handleAddReply - files.length:', files.length);
      
      if (files.length > 0) {
        try {
          // Asegúrate de que files sea un array de File objects
          const filesArray = Array.isArray(files) ? files : [];
          console.log('🚀 filesArray final:', filesArray);
          console.log('🚀 filesArray.length:', filesArray.length);
          
          // ✅ LLAMADA CORRECTA - pasar parámetros separados, no como objeto
          console.log('🚀 Llamando uploadFiles con archivos:', filesArray.length, 'replyId:', replyData.id);
          const uploadedFiles = await uploadReplyFilesFromComponent(filesArray, replyData.id);
          console.log('✅ Archivos subidos exitosamente:', uploadedFiles);
          
          // 🔍 DEBUG: Verificar que los archivos se guardaron en DB
          await debugReplyFiles(replyData.id);
          
        } catch (error) {
          console.error('❌ Error subiendo archivos:', error);
          toast({
            title: "Error",
            description: "Error subiendo archivos",
            variant: "destructive",
          });
        }
      } else {
        console.log('🚀 No hay archivos para subir');
      }

      // 3. Limpiar formularios
      setNewReply(prev => ({
        ...prev,
        [postId]: ''
      }));

      // Limpiar archivos de la respuesta
      setReplyFiles(prev => ({
        ...prev,
        [postId]: []
      }));

      // 4. Actualizar comentarios y conteo de posts
      console.log('🚀 Recargando replies...');
      await fetchReplies(postId);
      fetchPosts();
      
      toast({
        title: "Comentario agregado",
        description: "Tu comentario ha sido publicado",
      });
      
      console.log('✅ handleAddReply - COMPLETADO');
      
    } catch (error: any) {
      console.error('❌ Error adding reply:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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

  // Función para agregar respuesta anidada
  const handleAddNestedReply = async (parentReplyId: string, content: string, files: File[] = []) => {
    if (!user || !content.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      console.log('🚀 handleAddNestedReply - INICIO');
      console.log('🚀 parentReplyId:', parentReplyId);
      console.log('🚀 content:', content);
      console.log('🚀 files:', files.length);

      // Crear la respuesta anidada
      const { data: replyData, error: replyError } = await supabase
        .from('forum_nested_replies' as any)
        .insert({
          parent_reply_id: parentReplyId,
          content: content.trim(),
          author_id: user.id
        })
        .select()
        .single();

      if (replyError) throw replyError;

      // Verificar que replyData no sea un error
      if (!replyData) throw new Error('No se pudo crear la respuesta anidada');

      // Subir archivos si existen
      let uploadedFiles: any[] = [];
      if (files && files.length > 0) {
        uploadedFiles = await uploadNestedFiles(files, replyData.id);
      }

      // Actualizar estado local
      const newNestedReply = {
        id: replyData.id,
        content: replyData.content,
        created_at: replyData.created_at,
        author_id: replyData.author_id,
        author_name: (user as any).full_name || 'Usuario',
        author_role: (user as any).role || 'student',
        files: uploadedFiles
      };

      setReplies(prev => ({
        ...prev,
        [`nested_${parentReplyId}`]: [...(prev[`nested_${parentReplyId}`] || []), newNestedReply]
      }));

      // Limpiar formulario
      setNestedReplyContent(prev => ({
        ...prev,
        [parentReplyId]: ''
      }));
      setNestedReplyFiles(prev => ({
        ...prev,
        [parentReplyId]: []
      }));
      setShowNestedForm(null);

      toast({
        title: "Éxito",
        description: "Respuesta agregada correctamente",
      });

    } catch (error) {
      console.error('Error adding nested reply:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la respuesta",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para cargar respuestas anidadas
  const fetchNestedReplies = async (parentReplyId: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_nested_replies' as any)
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles (
            full_name,
            role
          ),
          forum_nested_reply_files (
            id,
            file_url,
            file_name,
            file_type,
            file_size
          )
        `)
        .eq('parent_reply_id', parentReplyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const processedReplies = (data || []).map((reply: any) => ({
        ...reply,
        author_name: reply.profiles?.full_name || 'Usuario',
        author_role: reply.profiles?.role || 'student',
        files: reply.forum_nested_reply_files || []
      }));

      setReplies(prev => ({
        ...prev,
        [`nested_${parentReplyId}`]: processedReplies
      }));
    } catch (error) {
      console.error('Error fetching nested replies:', error);
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

  // Componente para respuesta individual con estilo chat
  const ReplyComponent = ({ reply, postId, currentUserId }: { reply: any; postId: string; currentUserId: string }) => {
    const isAdmin = reply.author_role === 'admin';
    const isCurrentUser = reply.author_id === currentUserId;
    const nestedReplies = replies[`nested_${reply.id}`] || [];

    return (
      <div className={`space-y-3 ${isCurrentUser ? 'ml-8' : 'mr-8'}`}>
        {/* RESPUESTA PRINCIPAL */}
        <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
            isAdmin 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {reply.author_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          
          <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
            {/* Bubble del mensaje */}
            <div className={`group relative transition-all duration-200 hover:shadow-md rounded-2xl p-4 ${
              isCurrentUser
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : isAdmin 
                  ? 'bg-gradient-to-r from-orange-500/10 to-orange-600/20 border border-orange-200 rounded-bl-md text-foreground'
                  : 'bg-muted hover:bg-muted/80 rounded-bl-md text-foreground'
            }`}>
              
              {/* Header del mensaje */}
              <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="font-medium text-sm">{reply.author_name}</span>
                {isAdmin && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isCurrentUser 
                      ? 'bg-primary-foreground/20 text-primary-foreground' 
                      : 'bg-orange-500 text-white'
                  }`}>
                    Admin
                  </span>
                )}
              </div>
              
              {/* Contenido del mensaje */}
              <p className="leading-relaxed text-sm">{reply.content}</p>
              
              {/* Archivos adjuntos */}
              {reply.files && reply.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {reply.files.map((file: any) => {
                      const isImage = file.file_type?.startsWith('image/');
                      const formatFileSize = (bytes: number) => {
                        if (bytes < 1024) return `${bytes} B`;
                        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
                        return `${(bytes / 1048576).toFixed(1)} MB`;
                      };

                      if (isImage) {
                        return (
                          <div key={file.id} className="group relative max-w-xs">
                            <div 
                              className="relative overflow-hidden rounded-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
                              onClick={() => setSelectedImage(file.file_url)}
                            >
                              <img 
                                src={file.file_url} 
                                alt={file.file_name}
                                className="w-full h-auto max-h-48 object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <div className="bg-white/90 rounded-full p-2">
                                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {file.file_name} • {formatFileSize(file.file_size)}
                            </p>
                          </div>
                        );
                      }

                      // Para archivos no-imagen
                      const getFileIcon = (type: string) => {
                        if (type?.includes('pdf')) return '📄';
                        if (type?.includes('document') || type?.includes('word')) return '📝';
                        if (type?.includes('spreadsheet') || type?.includes('excel')) return '📊';
                        return '📎';
                      };

                      return (
                        <div key={file.id} className={`flex items-center gap-2 p-2 rounded-lg ${
                          isCurrentUser ? 'bg-primary-foreground/10' : 'bg-background/50'
                        }`}>
                          <div className="text-lg">{getFileIcon(file.file_type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-xs truncate ${
                              isCurrentUser ? 'text-primary-foreground' : 'text-foreground'
                            }`}>
                              {file.file_name}
                            </p>
                            <p className={`text-xs ${
                              isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {formatFileSize(file.file_size)}
                            </p>
                          </div>
                          <button 
                            onClick={() => setSelectedImage(file.file_url)}
                            className={`text-xs px-2 py-1 rounded-md transition-colors ${
                              isCurrentUser 
                                ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30' 
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                          >
                            Ver
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer con timestamp y botón responder */}
            <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
              isCurrentUser ? 'flex-row-reverse' : 'flex-row'
            }`}>
              <span>
                {new Date(reply.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span>•</span>
              <button
                onClick={() => setShowNestedForm(showNestedForm === reply.id ? null : reply.id)}
                className="hover:text-foreground transition-colors hover:underline"
              >
                {showNestedForm === reply.id ? 'Cancelar' : 'Responder'}
              </button>
            </div>
          </div>
        </div>

        {/* FORMULARIO PARA RESPUESTA ANIDADA */}
        {showNestedForm === reply.id && (
          <div className={`${isCurrentUser ? 'mr-12' : 'ml-12'} mt-3`}>
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {(user as any)?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                
                <div className="flex-1 space-y-2">
                  <textarea
                    value={nestedReplyContent[reply.id] || ''}
                    onChange={(e) => setNestedReplyContent(prev => ({
                      ...prev,
                      [reply.id]: e.target.value
                    }))}
                    placeholder="Responder a este comentario..."
                    className="w-full min-h-[60px] p-2 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                  />
                  
                  {/* Archivos seleccionados para respuesta anidada */}
                  {nestedReplyFiles[reply.id] && nestedReplyFiles[reply.id].length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {nestedReplyFiles[reply.id].map((file, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => setNestedReplyFiles(prev => ({
                              ...prev,
                              [reply.id]: prev[reply.id]?.filter((_, i) => i !== index) || []
                            }))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf,.doc,.docx"
                        onChange={(e) => {
                          if (e.target.files) {
                            setNestedReplyFiles(prev => ({
                              ...prev,
                              [reply.id]: [...(prev[reply.id] || []), ...Array.from(e.target.files!)]
                            }));
                          }
                        }}
                        className="hidden"
                      />
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      📎
                    </label>
                    
                    <button
                      onClick={() => handleAddNestedReply(reply.id, nestedReplyContent[reply.id], nestedReplyFiles[reply.id] || [])}
                      disabled={!nestedReplyContent[reply.id]?.trim() || isSubmitting}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESPUESTAS ANIDADAS */}
        {nestedReplies.length > 0 && (
          <div className={`space-y-2 ${isCurrentUser ? 'mr-6' : 'ml-6'}`}>
            {nestedReplies.map((nestedReply: any) => (
              <ReplyComponent 
                key={nestedReply.id} 
                reply={nestedReply} 
                postId={postId} 
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    );
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
              <h3 className="text-lg font-medium text-foreground mb-2">
                {forums.length === 0 ? 'No tienes acceso a foros' : 'No hay publicaciones'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {forums.length === 0 
                  ? 'No estás inscrito en ningún programa o no hay foros disponibles para tus programas. Contacta al administrador para obtener acceso.'
                  : searchTerm || filterCategory !== 'todos' 
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
                              {file.file_type.startsWith('image/') ? (
                                <img 
                                  src={file.file_url} 
                                  alt={file.file_name}
                                  className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedImage(file.file_url)}
                                />
                              ) : (
                                <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
                                  📎
                                </div>
                              )}
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
                <div className="border-t bg-muted/30 p-4">
                {/* Botón para mostrar/ocultar respuestas */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReplies(post.id)}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.replies_count || 0} respuestas</span>
                    {showReplies[post.id] ? (
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </Button>
                                    </div>

                {/* Lista de comentarios con estilo chat - Solo se muestra si showReplies está activo */}
                {showReplies[post.id] && replies[post.id] && replies[post.id].length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-sm text-muted-foreground px-4">
                      {replies[post.id].length} respuesta{replies[post.id].length !== 1 ? 's' : ''}
                    </h4>
                    
                    <div className="space-y-4">
                      {replies[post.id].map((reply: any) => (
                        <ReplyComponent 
                          key={reply.id} 
                          reply={reply} 
                          postId={post.id} 
                          currentUserId={user?.id || ''}
                        />
                                ))}
                              </div>
                            </div>
                          )}
                    
                {/* Formulario para nuevo comentario - SIEMPRE VISIBLE */}
                <div className="border-t pt-4">
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
                        className="min-h-[80px]"
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

      {/* Modal mejorado para mostrar imagen en tamaño completo */}
            {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            {/* Botón de cerrar mejorado */}
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-sm flex items-center gap-2 bg-black/20 hover:bg-black/40 px-3 py-1 rounded-md transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cerrar (ESC)
            </button>
            
            {/* Imagen con animación */}
              <img 
                src={selectedImage} 
                alt="Imagen ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Botones de acción */}
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex gap-2">
              <a 
                href={selectedImage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2 transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Abrir original
              </a>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedImage;
                  link.download = 'imagen.jpg';
                  link.click();
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar
              </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}