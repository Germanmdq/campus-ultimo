import * as React from "react"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRefreshSession } from "@/hooks/useRefreshSession"
import { ensureAvatarsBucket } from "@/utils/createBucket"

interface AvatarUploadProps {
  value?: string
  onChange?: (url: string) => void
  name: string
  className?: string
  disabled?: boolean
}

export function AvatarUpload({ 
  value, 
  onChange, 
  name, 
  className,
  disabled = false 
}: AvatarUploadProps) {
  const [uploading, setUploading] = React.useState(false)
  const { toast } = useToast()
  const { refreshSession, checkAndRefreshSession } = useRefreshSession()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validaciones básicas
    if (!file.type.startsWith('image/')) {
      toast({
        title: "❌ Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "❌ Error", 
        description: "La imagen debe ser menor a 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      console.log('🚀 Starting avatar upload...');

      // 1. Verificar autenticación
      const sessionValid = await checkAndRefreshSession();
      if (!sessionValid) {
        toast({
          title: "🔐 Sesión expirada",
          description: "Inicia sesión nuevamente para subir tu foto",
          variant: "destructive"
        });
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('🔐 Auth error:', authError);
        toast({
          title: "🔐 Error de autenticación",
          description: "No se pudo verificar tu identidad",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ User authenticated:', user.id);

      // 2. Generar nombre de archivo único
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      
      // Usar diferentes estrategias de nombres según el contexto
      const fileNames = [
        `${user.id}/avatar-${timestamp}.${fileExt}`,          // Con folder del usuario
        `avatar-${user.id}-${timestamp}.${fileExt}`,          // Con ID de usuario
        `avatar-${timestamp}-${randomId}.${fileExt}`,         // Solo timestamp + random
        `avatars/${user.id}-${timestamp}.${fileExt}`,         // Con subfolder
        `user-avatar-${Date.now()}.${fileExt}`                // Nombre más simple
      ];

      console.log('📝 Generated filename options:', fileNames);

      // 3. Intentar upload con diferentes estrategias
      const uploadResult = await tryMultipleUploadStrategies(file, fileNames);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      console.log('✅ Upload successful:', uploadResult.publicUrl);

      // 4. Actualizar UI
      onChange?.(uploadResult.publicUrl);
      
      toast({
        title: "✅ ¡Foto actualizada!",
        description: "Tu avatar se subió correctamente",
      });

    } catch (error: any) {
      console.error('💥 Upload error:', error);
      
      // Determinar tipo de error y mostrar mensaje apropiado
      const errorMessage = getUploadErrorMessage(error);
      toast({
        title: "❌ Error al subir foto",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      resetFileInput();
    }
  };

  // 🔄 INTENTAR MÚLTIPLES ESTRATEGIAS DE UPLOAD
  const tryMultipleUploadStrategies = async (file: File, fileNames: string[]) => {
    for (let i = 0; i < fileNames.length; i++) {
      const fileName = fileNames[i];
      console.log(`📤 Upload attempt ${i + 1}/${fileNames.length}: ${fileName}`);

      try {
        // Intentar upload con configuraciones progresivamente más permisivas
        const uploadConfigs = [
          {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          },
          {
            cacheControl: '3600',
            upsert: true
          },
          {
            upsert: true
          },
          {} // Configuración mínima
        ];

        for (const config of uploadConfigs) {
          try {
            const { data, error } = await supabase.storage
              .from('avatars')
              .upload(fileName, file, config);

            if (error) {
              console.warn(`⚠️ Config failed for ${fileName}:`, error.message);
              continue;
            }

            // Si llegamos aquí, el upload fue exitoso
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            console.log(`✅ Upload successful with config:`, config);
            return {
              success: true,
              publicUrl: urlData.publicUrl,
              fileName,
              config
            };

          } catch (configError: any) {
            console.warn(`⚠️ Config error:`, configError.message);
            continue;
          }
        }

      } catch (fileError: any) {
        console.warn(`⚠️ Filename ${fileName} failed:`, fileError.message);
        
        // Si es el último nombre y aún falla, verificar si es problema de bucket
        if (i === fileNames.length - 1) {
          if (fileError.message?.includes('bucket') || 
              fileError.message?.includes('not found')) {
            return await handleMissingBucket(file);
          }
        }
        continue;
      }
    }

    return {
      success: false,
      error: 'Todos los intentos de upload fallaron. Verifica la configuración del almacenamiento.'
    };
  };

  // 🪣 MANEJAR BUCKET FALTANTE
  const handleMissingBucket = async (file: File) => {
    console.log('🪣 Bucket not found, showing setup instructions...');
    
    // Mostrar instrucciones específicas para crear el bucket manualmente
    const setupMessage = `
⚙️ CONFIGURACIÓN NECESARIA:

El bucket 'avatars' no existe. Para solucionarlo:

1. Ve a tu proyecto Supabase
2. Ve a Storage → Buckets  
3. Crea un nuevo bucket llamado 'avatars'
4. Configuración recomendada:
   • Público: ✅ Sí
   • Límite de archivo: 5MB
   • Tipos MIME: image/jpeg, image/png, image/webp, image/gif

Alternativamente, ejecuta este SQL en el SQL Editor:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;
    `;

    console.log(setupMessage);

    return {
      success: false,
      error: 'Bucket de avatares no encontrado. Verifica la configuración del almacenamiento.',
      setupRequired: true
    };
  };

  // 📋 OBTENER MENSAJE DE ERROR APROPIADO
  const getUploadErrorMessage = (error: any): string => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('cors') || message.includes('origin')) {
      return '🌐 Error de CORS. No se necesitan funciones serverless para subir avatares.';
    }
    
    if (message.includes('bucket') || message.includes('not found')) {
      return '🪣 Bucket no encontrado. Crea el bucket "avatars" en Supabase Storage.';
    }
    
    if (message.includes('row-level security') || message.includes('policy')) {
      return '🔒 Error de permisos RLS. Configura las políticas de storage.';
    }
    
    if (message.includes('file size') || message.includes('payload too large')) {
      return '📏 Archivo demasiado grande. Reduce el tamaño de la imagen.';
    }
    
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return '🔐 Error de autenticación. Inicia sesión nuevamente.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return '🌐 Error de conexión. Verifica tu internet.';
    }
    
    if (message.includes('timeout')) {
      return '⏱️ Tiempo de espera agotado. Intenta con una imagen más pequeña.';
    }
    
    // Error genérico con mensaje original para debugging
    return `💥 ${error.message || 'Error desconocido al subir la imagen'}`;
  };

  // 🧹 LIMPIAR INPUT DE ARCHIVO
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      console.log('🧹 File input reset');
    }
  };

  const handleRemove = () => {
    onChange?.('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={value} alt={name} />
          <AvatarFallback className="bg-accent text-accent-foreground text-lg">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {value && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
            disabled={uploading || disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          {uploading ? 'Subiendo...' : value ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG o GIF. Máx. 5MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || disabled}
      />
    </div>
  )
}
