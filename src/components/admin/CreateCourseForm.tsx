import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface CreateCourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCourseForm({ open, onOpenChange, onSuccess }: CreateCourseFormProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [slug, setSlug] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [wideUrl, setWideUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const ensureUniqueSlug = async (base: string) => {
    const baseSlug = base || 'curso';
    const { data } = await supabase
      .from('courses')
      .select('slug')
      .ilike('slug', `${baseSlug}%`);
    const taken = new Set((data || []).map((r: any) => r.slug));
    if (!taken.has(baseSlug)) return baseSlug;
    let i = 2;
    while (taken.has(`${baseSlug}-${i}`)) i++;
    return `${baseSlug}-${i}`;
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Título es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const base = generateSlug(title.trim());
      const uniqueSlug = await ensureUniqueSlug(base);
      const { error } = await supabase
        .from('courses')
        .insert([{
          title: title.trim(),
          summary: summary.trim() || null,
          slug: uniqueSlug,
          poster_2x3_url: posterUrl.trim() || null,
          wide_11x6_url: wideUrl.trim() || null,
          sort_order: 0
        }]);

      if (error) throw error;

      toast({
        title: "Curso creado",
        description: `El curso "${title}" ha sido creado exitosamente`,
      });

      // Reset form
      setTitle('');
      setSummary('');
      setSlug('');
      setPosterUrl('');
      setWideUrl('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el curso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Curso</DialogTitle>
          <DialogDescription>Completa los campos para crear un curso. Opcionalmente asígnalo a un programa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Curso se crea libre; se relaciona desde Programas */}

          <div>
            <Label htmlFor="title">Título del Curso</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Introducción a los Patrones"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="summary">Resumen</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe brevemente el curso..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUpload
              label="Imagen Poster (2x3)"
              value={posterUrl}
              onChange={setPosterUrl}
              aspectRatio="2/3"
              disabled={loading}
            />

            <ImageUpload
              label="Imagen Wide (11x6)"
              value={wideUrl}
              onChange={setWideUrl}
              aspectRatio="11/6"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                'Crear Curso'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}