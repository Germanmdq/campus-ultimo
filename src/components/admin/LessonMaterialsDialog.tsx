import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Link, Upload, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Material {
  id: string;
  title: string;
  type: 'file' | 'link';
  file_url?: string;
  url?: string;
  sort_order: number;
}

interface LessonMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
}

export function LessonMaterialsDialog({ 
  open, 
  onOpenChange, 
  lessonId, 
  lessonTitle 
}: LessonMaterialsDialogProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    type: 'link' as 'file' | 'link',
    url: '',
    file: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchMaterials();
    }
  }, [open, lessonId]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sort_order');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleAddMaterial = async () => {
    
    if (!newMaterial.title.trim()) {
      toast({
        title: "Error",
        description: "El título es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (newMaterial.type === 'link' && !newMaterial.url.trim()) {
      toast({
        title: "Error",
        description: "La URL es obligatoria para materiales de enlace",
        variant: "destructive",
      });
      return;
    }

    if (newMaterial.type === 'file' && !newMaterial.file) {
      toast({
        title: "Error",
        description: "Selecciona un archivo",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      let fileUrl = null;
      let url = null;

      if (newMaterial.type === 'file' && newMaterial.file) {
        fileUrl = await handleFileUpload(newMaterial.file);
        if (!fileUrl) {
          throw new Error('Error uploading file');
        }
      } else {
        url = newMaterial.url.trim();
      }

      const insertData = {
        lesson_id: lessonId,
        title: newMaterial.title.trim(),
        type: newMaterial.type,
        file_url: fileUrl,
        url: url,
        sort_order: materials.length + 1
      };


      const { error } = await supabase
        .from('lesson_materials')
        .insert([insertData]);

      if (error) {
        console.error('Database error inserting material:', error);
        throw error;
      }


      // Update lesson to mark it has materials
      await supabase
        .from('lessons')
        .update({ has_materials: true })
        .eq('id', lessonId);

      toast({
        title: "Material agregado",
        description: "El material ha sido agregado exitosamente",
      });

      setNewMaterial({ title: '', type: 'link', url: '', file: null });
      fetchMaterials();
    } catch (error: any) {
      console.error('Full error adding material:', error);
      toast({
        title: "Error",
        description: `No se pudo agregar el material: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const { error } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      // Check if there are any materials left
      const remainingMaterials = materials.filter(m => m.id !== materialId);
      if (remainingMaterials.length === 0) {
        await supabase
          .from('lessons')
          .update({ has_materials: false })
          .eq('id', lessonId);
      }

      toast({
        title: "Material eliminado",
        description: "El material ha sido eliminado",
      });

      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el material",
        variant: "destructive",
      });
    }
  };

  const getMaterialIcon = (type: string) => {
    return type === 'file' ? <FileText className="h-4 w-4" /> : <Link className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Materiales - {lessonTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Add new material form */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium">Agregar Material</h3>
              
              <div>
                <Label>Título</Label>
                <Input
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  placeholder="Nombre del material"
                />
              </div>

              <div>
                <Label>Tipo</Label>
                <Select 
                  value={newMaterial.type} 
                  onValueChange={(value: 'file' | 'link') => setNewMaterial({ ...newMaterial, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Enlace URL</SelectItem>
                    <SelectItem value="file">Archivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newMaterial.type === 'link' ? (
                <div>
                  <Label>URL</Label>
                  <Input
                    type="url"
                    value={newMaterial.url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div>
                  <Label>Archivo</Label>
                  <Input
                    type="file"
                    onChange={(e) => setNewMaterial({ ...newMaterial, file: e.target.files?.[0] || null })}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp4,.mp3"
                  />
                </div>
              )}

              <Button onClick={handleAddMaterial} disabled={adding} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {adding ? 'Agregando...' : 'Agregar Material'}
              </Button>
            </CardContent>
          </Card>

          {/* Materials list */}
          <div className="flex-1 overflow-y-auto space-y-3">
            <h3 className="font-medium">Materiales existentes ({materials.length})</h3>
            
            {materials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay materiales en esta lección</p>
                <p className="text-sm mt-2">Agrega el primer material usando el formulario de arriba</p>
              </div>
            ) : (
              materials.map(material => (
                <Card key={material.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getMaterialIcon(material.type)}
                        <div>
                          <h4 className="font-medium">{material.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {material.type === 'file' ? 'Archivo' : 'Enlace'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {material.type === 'link' && material.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(material.url, '_blank')}
                          >
                            Abrir
                          </Button>
                        )}
                        {material.type === 'file' && material.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(material.file_url, '_blank')}
                          >
                            Descargar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMaterial(material.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}