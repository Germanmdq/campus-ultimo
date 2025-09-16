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
      // 1. Verificar autenticación
      const user = await verifyAuthentication();
      if (!user) return;

      console.log('🔐 User authenticated:', user.id);

      // 2. Intentar upload sin crear bucket (asumiendo que existe)
      const uploadResult = await attemptDirectUpload(file, user.id);
      
      if (uploadResult.success) {
        // Upload exitoso
        onChange?.(uploadResult.publicUrl);
        toast({
          title: "✅ Foto actualizada",
          description: "Tu foto de perfil fue actualizada exitosamente"
        });
        return;
      }

      // 3. Si falla, mostrar mensaje informativo
      console.error('❌ Upload failed:', uploadResult.error);
      
      // Determinar si es problema de RLS o configuración
      if (uploadResult.error.includes('row-level security') || 
          uploadResult.error.includes('policy')) {
        
        toast({
          title: "⚙️ Configuración requerida",
          description: "El almacenamiento necesita configuración. Contacta al administrador.",
          variant: "destructive"
        });
        
        // Log detallado para el administrador
        console.error('🚨 RLS CONFIGURATION NEEDED:', {
          error: uploadResult.error,
          userId: user.id,
          timestamp: new Date().toISOString(),
          action: 'Please run the SQL setup commands in Supabase'
        });
        
      } else {
        toast({
          title: "❌ Error de upload",
          description: uploadResult.error || "Error desconocido al subir imagen",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      toast({
        title: "💥 Error inesperado",
        description: "Algo salió mal. Intenta de nuevo o contacta soporte.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      resetFileInput();
    }
  };

  // 🔐 VERIFICACIÓN DE AUTENTICACIÓN SIMPLIFICADA
  const verifyAuthentication = async () => {
    try {
      const sessionValid = await checkAndRefreshSession();
      if (!sessionValid) {
        toast({
          title: "🔐 Sesión expirada",
          description: "Inicia sesión nuevamente para subir tu foto",
          variant: "destructive"
        });
        return null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast({
          title: "🔐 Error de autenticación",
          description: "No se pudo verificar tu identidad",
          variant: "destructive"
        });
        return null;
      }

      return user;
    } catch (error: any) {
      console.error('🚨 Auth verification failed:', error);
      return null;
    }
  };

  // 📤 INTENTO DIRECTO DE UPLOAD (SIN CREAR BUCKET)
  const attemptDirectUpload = async (file: File, userId: string) => {
    try {
      // Generar nombre de archivo
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = `avatar-${userId}-${timestamp}.${fileExt}`;

      console.log('📤 Attempting direct upload:', fileName);

      // Intentar upload directo
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (error) {
        console.error('❌ Direct upload failed:', error);
        
        // Si es error de RLS, intentar con nombre más simple
        if (error.message.includes('row-level security') || 
            error.message.includes('policy')) {
          
          console.log('🔄 Trying simplified filename due to RLS...');
          const simpleFileName = `avatar-${timestamp}.${fileExt}`;
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from('avatars')
            .upload(simpleFileName, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type
            });

          if (retryError) {
            return { 
              success: false, 
              error: `RLS Error: ${retryError.message}` 
            };
          }

          // Obtener URL pública del archivo con nombre simple
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(simpleFileName);

          console.log('✅ Simplified upload successful:', urlData.publicUrl);
          return { 
            success: true, 
            publicUrl: urlData.publicUrl,
            fileName: simpleFileName 
          };
        }
        
        return { success: false, error: error.message };
      }

      // Upload exitoso con nombre original
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('✅ Direct upload successful:', urlData.publicUrl);
      return { 
        success: true, 
        publicUrl: urlData.publicUrl,
        fileName 
      };

    } catch (error: any) {
      console.error('💥 Upload attempt failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown upload error' 
      };
    }
  };

  // 🧹 LIMPIEZA DEL INPUT
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
