import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Plus, Search, Heart, MessageCircle, Pin, Loader2, Edit, Trash2, Settings, Image as ImageIcon, Film, Smile, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  cover_image_url?: string;
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

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newForum, setNewForum] = useState({
    name: '',
    description: '',
    program_ids: [] as string[],
    cover_image: null as File | null
  });
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [showEditForum, setShowEditForum] = useState(false);
  const [showReplies, setShowReplies] = useState<{ [postId: string]: boolean }>({});
  const [newReply, setNewReply] = useState<{ [postId: string]: string }>({});
  const [replies, setReplies] = useState<{ [postId: string]: any[] }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyFiles, setReplyFiles] = useState<{ [postId: string]: File[] }>({});

  // Quick post state (Facebook style)
  const [quickPostContent, setQuickPostContent] = useState('');
  const [quickPostFiles, setQuickPostFiles] = useState<File[]>([]);
  const [showQuickPostDialog, setShowQuickPostDialog] = useState(false);

  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin' || profile?.role === 'voluntario';

  useEffect(() => {
    fetchPosts();
    fetchForums();
    fetchPrograms();
  }, []);

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

      const validPosts = (data || []).filter((post: any) => post.profiles);

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role as string;

      if (userRole === 'admin' || userRole === 'formador' || userRole === 'voluntario') {
        const { data, error } = await supabase
          .from('forums')
          .select(`
            id,
            name,
            description,
            program_id,
            cover_image_url,
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

      const programIds = userPrograms.map(up => up.program_id);

      const { data, error } = await supabase
        .from('forums')
        .select(`
          id,
          name,
          description,
          program_id,
          cover_image_url,
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
      .order('title');

    setPrograms(data || []);
  };

  const uploadForumCoverImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `forum-cover-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `forum-covers/${fileName}`;

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

      return publicUrl;
    } catch (error) {
      console.error('Error uploading forum cover:', error);
      return null;
    }
  };

  const uploadPostFiles = async (postId: string, files: File[]) => {
    if (files.length === 0) return [];

    console.log('🔥 INICIANDO SUBIDA DE ARCHIVOS');
    console.log('🔥 Archivos a subir:', files.length);
    console.log('🔥 PostId:', postId);

    setUploadingFiles(true);
    const uploadedFiles = [];

    try {
      // Verificar que el bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.warn('⚠️ No se pudieron listar buckets:', bucketsError);
      }

      const forumFilesBucket = buckets?.find(b => b.id === 'forum-files');
      if (!forumFilesBucket) {
        console.log(`⚠️ Bucket 'forum-files' no encontrado. Intentando crearlo...`);
        const { error: createError } = await supabase.storage.createBucket('forum-files', { public: true });
        if (createError) {
          console.error('❌ No se pudo crear el bucket forum-files:', createError);
          toast({
            title: 'Error de configuración',
            description: 'El bucket de archivos no existe. Por favor contacta al administrador.',
            variant: 'destructive'
          });
          setUploadingFiles(false);
          return [];
        }
        console.log(`✅ Bucket 'forum-files' creado exitosamente`);
      } else {
        console.log("✅ Bucket 'forum-files' existe");
      }

      for (const file of files) {
        try {
          console.log(`📤 Subiendo archivo: ${file.name} (${file.type}, ${file.size} bytes)`);

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

          if (uploadError) {
            console.error('❌ Error en upload:', uploadError);
            throw uploadError;
          }

          console.log(`✅ Archivo subido a storage: ${filePath}`);

          const { data: { publicUrl } } = supabase.storage
            .from('forum-files')
            .getPublicUrl(filePath);

          console.log(`✅ URL pública generada: ${publicUrl}`);

          const { error: dbError } = await supabase
            .from('forum_post_files')
            .insert([{
              post_id: postId,
              file_url: publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size
            }]);

          if (dbError) {
            console.error('❌ Error guardando en DB:', dbError);
            throw dbError;
          }

          console.log(`✅ Metadata guardada en DB para: ${file.name}`);

          uploadedFiles.push({
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size
          });
        } catch (error: any) {
          console.error('❌ Error uploading file:', error);
          toast({
            title: "Error subiendo archivo",
            description: error?.message || `No se pudo subir ${file.name}`,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Error in uploadFiles:', error);
      toast({
        title: "Error general",
        description: error?.message || "Error al subir archivos",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(false);
    }

    console.log(`✅ Subida completada. ${uploadedFiles.length} de ${files.length} archivos subidos`);
    return uploadedFiles;
  };

  const handleQuickPost = async () => {
    if (!quickPostContent.trim()) {
      toast({
        title: "Error",
        description: "Escribe algo para publicar",
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
        title: quickPostContent.substring(0, 100),
        content: quickPostContent.trim(),
        category: 'general',
        forum_id: selectedForumId || null,
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

      if (quickPostFiles.length > 0) {
        await uploadPostFiles(data[0].id, quickPostFiles);
      }

      toast({
        title: "Publicación creada",
        description: "Tu publicación ha sido creada exitosamente",
      });

      setQuickPostContent('');
      setQuickPostFiles([]);
      setShowQuickPostDialog(false);
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
      let coverImageUrl: string | null = null;

      if (newForum.cover_image) {
        coverImageUrl = await uploadForumCoverImage(newForum.cover_image);
      }

      const forumsToCreate = newForum.program_ids.map(program_id => ({
        name: newForum.name.trim(),
        description: newForum.description.trim() || null,
        program_id: program_id,
        cover_image_url: coverImageUrl
      }));

      const { error } = await supabase
        .from('forums')
        .insert(forumsToCreate);

      if (error) throw error;

      toast({
        title: "Foro creado",
        description: `El foro "${newForum.name}" ha sido creado para ${newForum.program_ids.length} programa(s)`,
      });

      setNewForum({ name: '', description: '', program_ids: [], cover_image: null });
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
      program_ids: [forum.program_id],
      cover_image: null
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
      let updateData: any = {
        name: newForum.name.trim(),
        description: newForum.description.trim() || null,
        program_id: newForum.program_ids[0]
      };

      if (newForum.cover_image) {
        const coverImageUrl = await uploadForumCoverImage(newForum.cover_image);
        if (coverImageUrl) {
          updateData.cover_image_url = coverImageUrl;
        }
      }

      const { error } = await supabase
        .from('forums')
        .update(updateData)
        .eq('id', editingForum.id);

      if (error) throw error;

      toast({
        title: "Foro actualizado",
        description: `El foro "${newForum.name}" ha sido actualizado exitosamente`,
      });

      setNewForum({ name: '', description: '', program_ids: [], cover_image: null });
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
      const { error: postsError } = await supabase
        .from('forum_posts')
        .delete()
        .eq('forum_id', forum.id);

      if (postsError) throw postsError;

      const { error: forumError } = await supabase
        .from('forums')
        .delete()
        .eq('id', forum.id);

      if (forumError) throw forumError;

      toast({
        title: "Foro eliminado",
        description: `El foro "${forum.name}" y todos sus posts han sido eliminados exitosamente`,
      });

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

  const handleDeletePost = async (post: ForumPost) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', post.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Publicación eliminada',
        description: 'La publicación y todo su contenido asociado han sido eliminados.',
      });

      fetchPosts();
      fetchForums();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar la publicación: ${error.message || error}`,
        variant: 'destructive',
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
      const { data: existingLike } = await supabase
        .from('forum_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        const { error } = await supabase
          .from('forum_post_likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;
      } else {
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
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const validReplies = (data || []).filter((reply: any) => reply.profiles);

      if (validReplies.length === 0) {
        setReplies(prev => ({ ...prev, [postId]: [] }));
        return;
      }

      const replyIds = validReplies.map((r: any) => r.id);

      const { data: filesData, error: filesError } = await supabase
        .from('forum_reply_files' as any)
        .select('*')
        .in('reply_id', replyIds);

      if (filesError) {
        console.error('Error fetching files:', filesError);
      }

      const processedReplies = validReplies.map((reply: any) => {
        const replyFiles = filesData?.filter((f: any) => f.reply_id === reply.id) || [];

        return {
          id: reply.id,
          content: reply.content,
          author_name: reply.profiles?.full_name || 'Usuario',
          author_role: reply.profiles?.role || 'student',
          author_id: reply.author_id,
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
        console.error('Error creating reply:', replyError);
        throw replyError;
      }

      const files = replyFiles[postId] || [];

      if (files.length > 0) {
        await uploadPostFiles(replyData.id, files);
      }

      setNewReply(prev => ({
        ...prev,
        [postId]: ''
      }));

      setReplyFiles(prev => ({
        ...prev,
        [postId]: []
      }));

      await fetchReplies(postId);
      fetchPosts();

      toast({
        title: "Comentario agregado",
        description: "Tu comentario ha sido publicado",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReply = async (replyId: string, postId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta respuesta?')) {
      return;
    }

    try {
      const { data: filesData } = await supabase
        .from('forum_reply_files' as any)
        .select('file_url')
        .eq('reply_id', replyId);

      if (filesData && filesData.length > 0) {
        const filePaths = filesData.map((file: any) => {
          const urlParts = file.file_url.split('/');
          return urlParts.slice(urlParts.indexOf('forum-files') + 1).join('/');
        });
        const { error: removeError } = await supabase.storage.from('forum-files').remove(filePaths);
        if (removeError) throw removeError;
      }

      const { error: deleteError } = await supabase
        .from('forum_post_replies')
        .delete()
        .eq('id', replyId);

      if (deleteError) throw deleteError;

      toast({ title: 'Éxito', description: 'La respuesta ha sido eliminada.' });

      fetchReplies(postId);
      fetchPosts();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo eliminar la respuesta.', variant: 'destructive' });
    }
  };

  const toggleReplies = (postId: string) => {
    setShowReplies(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));

    if (!replies[postId]) {
      fetchReplies(postId);
    }
  };

  const filteredPosts = posts.filter(post => {
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
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Comunidad</h1>
            <p className="text-muted-foreground">
              Conecta con otros estudiantes y profesores
            </p>
          </div>
          {isTeacherOrAdmin && (
            <Dialog open={showCreateForumDialog} onOpenChange={setShowCreateForumDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Gestionar Foros
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
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
                    <Label htmlFor="forumCoverImage">Imagen de Portada</Label>
                    <Input
                      id="forumCoverImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewForum({ ...newForum, cover_image: file });
                        }
                      }}
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
          )}
        </div>

        {/* Forums Grid - Facebook Style */}
        {forums.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Foros Activos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {forums.map(forum => {
                const forumPosts = posts.filter(post => post.forum_id === forum.id);
                const totalPosts = forumPosts.length;
                return (
                  <Card
                    key={forum.id}
                    className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 ${
                      selectedForumId === forum.id ? 'border-primary shadow-lg' : 'border-transparent'
                    }`}
                    onClick={() => {
                      if (selectedForumId === forum.id) {
                        setSelectedForumId(null);
                      } else {
                        setSelectedForumId(forum.id);
                      }
                    }}
                  >
                    {/* Cover Image */}
                    <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                      {forum.cover_image_url ? (
                        <img
                          src={forum.cover_image_url}
                          alt={forum.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MessageSquare className="h-12 w-12 text-white/50" />
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg text-foreground">{forum.name}</h3>
                        {isTeacherOrAdmin && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditForum(forum)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteForum(forum)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {forum.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{forum.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {forum.program?.title}
                        </Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>{totalPosts} posts</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Post Box - Facebook Style */}
        <Card className="sticky top-4 z-10 shadow-md">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div
                  className="bg-muted hover:bg-muted/80 rounded-full px-4 py-2.5 cursor-text transition-colors"
                  onClick={() => setShowQuickPostDialog(true)}
                >
                  <p className="text-muted-foreground">
                    ¿Qué estás pensando, {profile?.full_name?.split(' ')[0] || 'Usuario'}?
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t mt-3 pt-3 flex items-center justify-around">
              <Button
                variant="ghost"
                className="flex-1 gap-2 text-muted-foreground hover:bg-muted"
                onClick={() => setShowQuickPostDialog(true)}
              >
                <ImageIcon className="h-5 w-5 text-green-500" />
                Foto/Video
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2 text-muted-foreground hover:bg-muted"
                onClick={() => setShowQuickPostDialog(true)}
              >
                <Smile className="h-5 w-5 text-yellow-500" />
                Sentimiento
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Post Dialog */}
        <Dialog open={showQuickPostDialog} onOpenChange={setShowQuickPostDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Crear publicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{profile?.full_name || 'Usuario'}</p>
                  <Select value={selectedForumId || 'general'} onValueChange={(value) => setSelectedForumId(value === 'general' ? null : value)}>
                    <SelectTrigger className="w-48 h-7 text-xs border-none bg-muted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Público</SelectItem>
                      {forums.map(forum => (
                        <SelectItem key={forum.id} value={forum.id}>
                          {forum.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Textarea
                placeholder={`¿Qué estás pensando, ${profile?.full_name?.split(' ')[0] || 'Usuario'}?`}
                value={quickPostContent}
                onChange={(e) => setQuickPostContent(e.target.value)}
                className="min-h-[120px] border-none text-lg focus-visible:ring-0 resize-none"
              />

              {quickPostFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {quickPostFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setQuickPostFiles(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Agregar a tu publicación</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,video/*';
                      input.multiple = true;
                      input.onchange = (e: any) => {
                        const files = Array.from(e.target.files || []) as File[];
                        setQuickPostFiles(prev => [...prev, ...files]);
                      };
                      input.click();
                    }}
                  >
                    <ImageIcon className="h-5 w-5 text-green-500" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleQuickPost}
                className="w-full"
                disabled={!quickPostContent.trim() || uploadingFiles}
              >
                {uploadingFiles ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Publicando...
                  </>
                ) : (
                  'Publicar'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        {selectedForumId && (
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-sm">
              Mostrando: {forums.find(f => f.id === selectedForumId)?.name || 'Foro seleccionado'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedForumId(null)}
            >
              Mostrar todos
            </Button>
          </div>
        )}

        {/* Posts Feed - Facebook Style */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium text-foreground mb-2">
                  {forums.length === 0 ? 'No tienes acceso a foros' : 'No hay publicaciones'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {forums.length === 0
                    ? 'No estás inscrito en ningún programa o no hay foros disponibles.'
                    : 'Sé el primero en crear una publicación en la comunidad'
                  }
                </p>
                {forums.length > 0 && (
                  <Button onClick={() => setShowQuickPostDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Crear Publicación
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map(post => (
              <Card key={post.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {/* Post Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(post.author_name || 'U')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-foreground hover:underline cursor-pointer">
                              {post.author_name}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{formatDate(post.created_at)}</span>
                              <span>·</span>
                              <Badge variant="outline" className="text-xs">
                                {post.author_role === 'formador' || post.author_role === 'teacher' ? 'Profesor' :
                                 post.author_role === 'admin' ? 'Admin' :
                                 post.author_role === 'voluntario' ? 'Voluntario' : 'Estudiante'}
                              </Badge>
                            </div>
                          </div>
                          {(post.author_id === user?.id || isTeacherOrAdmin) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="mt-3">
                      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                    </div>
                  </div>

                  {/* Post Images */}
                  {post.files && post.files.length > 0 && (
                    <div className="grid grid-cols-2 gap-1">
                      {post.files.slice(0, 4).map((file: ForumPostFile, index) => {
                        if (file.file_type?.startsWith('image/')) {
                          return (
                            <div
                              key={file.id}
                              className={`relative ${post.files!.length === 1 ? 'col-span-2' : ''} ${
                                index === 0 && post.files!.length === 3 ? 'col-span-2' : ''
                              }`}
                              onClick={() => setSelectedImage(file.file_url)}
                            >
                              <img
                                src={file.file_url}
                                alt={file.file_name}
                                className="w-full h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              />
                              {index === 3 && post.files!.length > 4 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer">
                                  <span className="text-white text-3xl font-bold">
                                    +{post.files!.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}

                  {/* Post Stats */}
                  <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground border-t">
                    <div className="flex items-center gap-1">
                      {post.likes_count! > 0 && (
                        <>
                          <div className="flex -space-x-1">
                            <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                              <Heart className="h-3 w-3 text-white fill-white" />
                            </div>
                          </div>
                          <span>{post.likes_count}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {post.replies_count! > 0 && (
                        <span>{post.replies_count} comentarios</span>
                      )}
                    </div>
                  </div>

                  {/* Post Actions */}
                  <div className="px-4 py-2 flex items-center justify-around border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikePost(post.id)}
                      className={`flex-1 gap-2 ${post.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      <Heart className={`h-5 w-5 ${post.is_liked ? 'fill-current' : ''}`} />
                      Me gusta
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReplies(post.id)}
                      className="flex-1 gap-2 text-muted-foreground"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Comentar
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {showReplies[post.id] && (
                    <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
                      {/* Existing Comments */}
                      {replies[post.id] && replies[post.id].length > 0 && (
                        <div className="space-y-3">
                          {replies[post.id].map((reply: any) => (
                            <div key={reply.id} className="flex gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-muted text-xs">
                                  {getInitials(reply.author_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="bg-muted rounded-2xl px-3 py-2">
                                  <p className="font-semibold text-sm">{reply.author_name}</p>
                                  <p className="text-sm text-foreground">{reply.content}</p>
                                </div>
                                <div className="flex items-center gap-3 px-3 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(reply.created_at)}
                                  </span>
                                  {(reply.author_id === user?.id || isTeacherOrAdmin) && (
                                    <>
                                      <span className="text-xs text-muted-foreground">·</span>
                                      <button
                                        onClick={() => handleDeleteReply(reply.id, post.id)}
                                        className="text-xs text-destructive hover:underline"
                                      >
                                        Eliminar
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New Comment Input */}
                      <div className="flex gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2 items-center">
                          <Input
                            placeholder="Escribe un comentario..."
                            value={newReply[post.id] || ''}
                            onChange={(e) => setNewReply(prev => ({
                              ...prev,
                              [post.id]: e.target.value
                            }))}
                            className="bg-muted border-none rounded-full flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddReply(post.id);
                              }
                            }}
                          />
                          {newReply[post.id]?.trim() && (
                            <Button
                              size="icon"
                              onClick={() => handleAddReply(post.id)}
                              className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                              title="Enviar comentario"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Forum Dialog */}
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
                <Label htmlFor="edit-forum-description">Descripción</Label>
                <Textarea
                  id="edit-forum-description"
                  value={newForum.description}
                  onChange={(e) => setNewForum({ ...newForum, description: e.target.value })}
                  placeholder="Descripción del foro"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-forum-cover">Imagen de Portada</Label>
                <Input
                  id="edit-forum-cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewForum({ ...newForum, cover_image: file });
                    }
                  }}
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

        {/* Image Viewer Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-7xl max-h-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white text-sm flex items-center gap-2"
              >
                <span>Cerrar (ESC)</span>
              </button>

              <img
                src={selectedImage}
                alt="Imagen ampliada"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
