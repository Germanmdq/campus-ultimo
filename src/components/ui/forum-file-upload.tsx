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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 === INICIO handleFileSelect ===');
    const selectedFiles = Array.from(event.target.files || []);
    console.log('📁 Archivos seleccionados:', selectedFiles.length);
    console.log('📁 Nombres de archivos:', selectedFiles.map(f => f.name));
    
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

  // Función eliminada - no hacer pre-upload aquí
  const uploadFiles = async (replyId?: string) => {
    // Esta función está deshabilitada - no hacer pre-upload
    console.log('⚠️ uploadFiles deshabilitada - no hacer pre-upload aquí');
    return;
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
                onClick={() => uploadFiles()} 
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

// Función separada para uso externo - VERSIÓN MEJORADA CON DEBUG
export const uploadFiles = async (files: File[], replyId: string) => {
  console.log('🔥 NUEVA uploadFiles - INICIO');
  console.log('🔥 Files recibidos:', files.length);
  console.log('🔥 ReplyId recibido:', replyId);
  
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.error('❌ No hay archivos válidos');
    return [];
  }
  
  if (!replyId) {
    console.error('❌ No hay replyId válido');
    return [];
  }
  
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`🔥 Procesando archivo ${i + 1}/${files.length}: ${file.name}`);
    
    try {
      // 1. Subir archivo a Supabase Storage
      const fileName = `replies/${replyId}/${Date.now()}-${file.name}`;
      console.log('🔥 Subiendo como:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('forum-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Error subiendo archivo:', uploadError);
        continue;
      }
      
      console.log('✅ Subido a storage:', uploadData);

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('forum-files')
        .getPublicUrl(fileName);
      
      console.log('🔥 URL pública:', publicUrl);

      // 3. CRÍTICO: Guardar en la tabla forum_reply_files
      console.log('🔥 Guardando en BD con datos:', {
        reply_id: replyId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      });

      const { data: dbData, error: dbError } = await supabase
        .from('forum_reply_files')
        .insert({
          reply_id: replyId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Error guardando en DB:', dbError);
        console.error('❌ Detalles del error:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        });
        
        // Eliminar archivo del storage si falla el guardado en DB
        await supabase.storage.from('forum-files').remove([fileName]);
        continue;
      }

      console.log('✅ Guardado en BD:', dbData);

      results.push({
        id: dbData.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      });

      console.log('✅ Archivo completado:', file.name);

    } catch (error) {
      console.error('❌ Error procesando archivo:', error);
    }
  }

  console.log('🔥 RESULTADO FINAL - Archivos procesados:', results.length);
  return results;
};

export const uploadFilesToSupabase = async (files: File[], replyId: string) => {
  console.log('🔥🔥🔥 uploadFilesToSupabase - INICIO 🔥🔥🔥');
  console.log('🔥 Files recibidos:', files);
  console.log('🔥 ReplyId recibido:', replyId);
  
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.error('❌ No hay archivos válidos');
    return [];
  }
  
  if (!replyId) {
    console.error('❌ No hay replyId');
    return [];
  }

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`🔥 Procesando archivo ${i + 1}/${files.length}: ${file.name}`);
    
    try {
      // 1. Subir a Storage
      const fileName = `replies/${replyId}/${Date.now()}-${file.name}`;
      console.log('🔥 Subiendo como:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('forum-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Error subiendo:', uploadError);
        continue;
      }
      
      console.log('✅ Subido a storage:', uploadData);

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('forum-files')
        .getPublicUrl(fileName);
      
      console.log('🔥 URL pública:', publicUrl);

      // 3. Guardar en base de datos
      console.log('🔥 Guardando en BD...');
      const { data: dbData, error: dbError } = await supabase
        .from('forum_reply_files')
        .insert({
          reply_id: replyId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Error en BD:', dbError);
        // Limpiar archivo si falla BD
        await supabase.storage.from('forum-files').remove([fileName]);
        continue;
      }

      console.log('✅ Guardado en BD:', dbData);

      const result = {
        id: dbData.id,
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size
      };

      results.push(result);
      console.log('🔥 Archivo completado:', result);

    } catch (error) {
      console.error('❌ Error procesando archivo:', file.name, error);
    }
  }

  console.log('🔥🔥🔥 RESULTADO FINAL:', results);
  return results;
};

export default ForumFileUpload;
