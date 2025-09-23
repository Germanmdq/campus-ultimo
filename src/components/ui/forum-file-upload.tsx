import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRefreshSession } from '@/hooks/useRefreshSession';
import { 
  Upload, 
  X, 
  File, 
  Image, 
  Video, 
  Music, 
  FileText,
  Download,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ForumFileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // en MB
  className?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  publicUrl?: string;
}

const ForumFileUpload: React.FC<ForumFileUploadProps> = ({
  onFilesChange,
  maxFiles = 5,
  maxSizePerFile = 10, // 10MB por defecto
  className = ''
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { checkAndRefreshSession } = useRefreshSession();

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Verificar tamaño
    const maxSizeBytes = maxSizePerFile * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `El archivo es demasiado grande. Máximo: ${maxSizePerFile}MB`
      };
    }

    // Verificar tamaño mínimo
    if (file.size < 1024) { // 1KB mínimo
      return {
        isValid: false,
        error: "El archivo es demasiado pequeño"
      };
    }

    // Verificar tipos de archivo permitidos
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4', 'video/avi', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        isValid: false,
        error: `Tipo de archivo no soportado. Formatos permitidos: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
      };
    }

    return { isValid: true };
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (fileType.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (fileType.includes('pdf') || fileType.includes('text')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Verificar límite de archivos
    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "❌ Demasiados archivos",
        description: `Máximo ${maxFiles} archivos permitidos`,
        variant: "destructive"
      });
      return;
    }

    const newFiles: UploadedFile[] = [];

    for (const file of selectedFiles) {
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        toast({
          title: "❌ Archivo inválido",
          description: validation.error,
          variant: "destructive"
        });
        continue;
      }

      const uploadedFile: UploadedFile = {
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploading: false,
        uploaded: false
      };

      newFiles.push(uploadedFile);
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles.map(f => f.file));
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles.map(f => f.file));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      // Verificar autenticación
      const sessionValid = await checkAndRefreshSession();
      if (!sessionValid) {
        toast({
          title: "🔐 Error de autenticación",
          description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("No se pudo verificar la autenticación");
      }

      // Verificar que el bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.warn('No se pudieron listar buckets:', bucketsError);
      }

      const forumFilesBucket = buckets?.find(b => b.id === 'forum-files');
      if (!forumFilesBucket) {
        toast({
          title: "🪣 Bucket no encontrado",
          description: "El bucket 'forum-files' no existe. Contacta al administrador.",
          variant: "destructive"
        });
        return;
      }

      // Subir archivos uno por uno
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];
        if (fileData.uploaded) continue;

        // Marcar como subiendo
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, uploading: true, error: undefined } : f
        ));

        try {
          const fileExt = fileData.file.name.split('.').pop()?.toLowerCase() || 'bin';
          const fileName = `forum-${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `forum-files/${fileName}`;

          // Subir archivo
          const { error: uploadError } = await supabase.storage
            .from('forum-files')
            .upload(filePath, fileData.file, {
              cacheControl: '3600',
              upsert: true,
              contentType: fileData.file.type
            });

          if (uploadError) {
            throw uploadError;
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('forum-files')
            .getPublicUrl(filePath);

          // Marcar como subido exitosamente
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              uploading: false, 
              uploaded: true, 
              publicUrl 
            } : f
          ));

        } catch (error: any) {
          console.error(`Error subiendo archivo ${fileData.file.name}:`, error);
          
          // Marcar como error
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              uploading: false, 
              uploaded: false, 
              error: error.message || 'Error desconocido'
            } : f
          ));
        }
      }

      // Verificar si todos se subieron correctamente
      const uploadedCount = files.filter(f => f.uploaded).length;
      const errorCount = files.filter(f => f.error).length;

      if (uploadedCount === files.length) {
        toast({
          title: "✅ Archivos subidos",
          description: `Se subieron ${uploadedCount} archivos correctamente`,
        });
      } else if (errorCount > 0) {
        toast({
          title: "⚠️ Subida parcial",
          description: `${uploadedCount} archivos subidos, ${errorCount} con errores`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('Error en uploadFiles:', error);
      toast({
        title: "❌ Error subiendo archivos",
        description: error.message || "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Input de archivos */}
      <div className="space-y-2">
        <Label htmlFor="forum-files">Archivos adjuntos</Label>
        <Input
          id="forum-files"
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="cursor-pointer"
        />
        <p className="text-sm text-muted-foreground">
          Máximo {maxFiles} archivos, {maxSizePerFile}MB cada uno
        </p>
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Archivos seleccionados ({files.length}/{maxFiles})</h4>
            {files.some(f => !f.uploaded && !f.uploading) && (
              <Button 
                onClick={uploadFiles} 
                disabled={uploading}
                size="sm"
              >
                {uploading ? "Subiendo..." : "Subir archivos"}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((fileData, index) => (
              <Card key={index} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center space-x-3">
                    {/* Icono del archivo */}
                    <div className="flex-shrink-0">
                      {fileData.preview ? (
                        <img 
                          src={fileData.preview} 
                          alt="Preview" 
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(fileData.file.type)
                      )}
                    </div>

                    {/* Información del archivo */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileData.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileData.file.size)}
                      </p>
                    </div>

                    {/* Estado del archivo */}
                    <div className="flex items-center space-x-2">
                      {fileData.uploading && (
                        <div className="flex items-center space-x-2">
                          <Progress value={50} className="w-16 h-2" />
                          <span className="text-xs">Subiendo...</span>
                        </div>
                      )}
                      
                      {fileData.uploaded && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Subido
                        </Badge>
                      )}
                      
                      {fileData.error && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Error
                        </Badge>
                      )}

                      {/* Botón de eliminar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mostrar error si existe */}
                  {fileData.error && (
                    <p className="text-xs text-red-600 mt-2">
                      {fileData.error}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumFileUpload;
