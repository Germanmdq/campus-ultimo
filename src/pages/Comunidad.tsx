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
import { MessageSquare, Plus, Search, Heart, MessageCircle, Pin, Loader2 } from 'lucide-react';
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
  const [newForum, setNewForum] = useState({
    name: '',
    description: '',
    program_id: ''
  });

  const isTeacherOrAdmin = profile?.role === 'formador' || profile?.role === 'admin';

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
          forum_id
        `)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
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
    const { data } = await supabase
      .from('forums')
      .select(`
        id,
        name,
        description,
        program_id,
        programs (title)
      `)
      .order('name');
    
    setForums(data || []);
  };

  const fetchPrograms = async () => {
    const { data } = await supabase
      .from('programs')
      .select('id, title')
      .not('published_at', 'is', null)
      .order('title');
    
    setPrograms(data || []);
  };

  const handleCreatePost = async () => {
    console.log('Trying to create post:', newPost);
    console.log('User:', user);
    
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

      console.log('Inserting post data:', postData);

      const { data, error } = await supabase
        .from('forum_posts')
        .insert([postData])
        .select('*');

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      console.log('Post created successfully:', data);

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
    if (!newForum.name.trim() || !newForum.program_id) {
      toast({
        title: "Error",
        description: "Nombre del foro y programa son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('forums')
        .insert([{
          name: newForum.name.trim(),
          description: newForum.description.trim() || null,
          program_id: newForum.program_id
        }]);

      if (error) throw error;

      toast({
        title: "Foro creado",
        description: `El foro "${newForum.name}" ha sido creado exitosamente`,
      });

      setNewForum({ name: '', description: '', program_id: '' });
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

  const handleLikePost = async (postId: string) => {
    if (!user) return;

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
        await supabase
          .from('forum_post_likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        // Agregar like
        await supabase
          .from('forum_post_likes')
          .insert([{
            post_id: postId,
            user_id: user.id
          }]);
      }

      fetchPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el like",
        variant: "destructive",
      });
    }
  };

  const filteredPosts = posts.filter(post => {
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
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
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
                  <Label htmlFor="forumProgram">Programa</Label>
                  <Select value={newForum.program_id} onValueChange={(value) => setNewForum({ ...newForum, program_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar programa" />
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

                <div className="flex gap-2">
                  <Button onClick={handleCreatePost} className="flex-1">
                    Publicar
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
                return (
                  <Card key={forum.id} className={`border hover:shadow-md transition-all cursor-pointer ${
                    selectedForumId === forum.id ? 'border-accent bg-accent/5' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{forum.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {forumPosts.length} posts
                        </Badge>
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
                          {selectedForumId === forum.id ? 'Ver todas' : 'Ver mensajes'}
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
                  Crear Primera Publicación
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
                        por Usuario
                      </span>
                      {post.category && (
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-foreground mb-4 line-clamp-3">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikePost(post.id)}
                        className="gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Heart className="h-4 w-4" />
                        <span>0</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>0</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}