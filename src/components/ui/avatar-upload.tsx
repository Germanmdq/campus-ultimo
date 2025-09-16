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

    // Enhanced file validation
    const validationResult = validateImageFile(file);
    if (!validationResult.isValid) {
      toast({
        title: "Error de validación",
        description: validationResult.error,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Verify authentication
      const user = await verifyAuthentication();
      if (!user) return;

      console.log('🔐 User authenticated:', user.id);

      // Generate optimized filename
      const fileName = generateAvatarFileName(file, user.id);
      
      console.log('📤 Attempting upload...', fileName);
      
      // Ensure storage bucket is ready
      await ensureAvatarsBucket();

      // Upload with retry logic
      const uploadResult = await uploadWithRetry(file, fileName);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadResult.fileName);

      console.log('✅ Upload successful:', urlData.publicUrl);

      // Update UI
      onChange?.(urlData.publicUrl);
      
      toast({
        title: "✅ Foto actualizada",
        description: "Tu foto de perfil fue actualizada exitosamente",
      });

    } catch (error: any) {
      console.error('💥 Avatar upload error:', error);
      toast({
        title: "💥 Error al subir imagen",
        description: getUploadErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      resetFileInput();
    }
  };

  // Helper functions for avatar upload
  const validateImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: "Solo se permiten archivos de imagen" };
    }
    
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: "La imagen debe ser menor a 5MB" };
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { 
        isValid: false, 
        error: "Formato no soportado. Usa JPG, PNG, WebP o GIF" 
      };
    }
    
    return { isValid: true };
  };

  const verifyAuthentication = async () => {
    const sessionValid = await checkAndRefreshSession();
    if (!sessionValid) {
      toast({
        title: "🔐 Error de autenticación",
        description: "Debes estar logueado. Por favor, inicia sesión.",
        variant: "destructive"
      });
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      toast({
        title: "🔐 Error de verificación",
        description: "No se pudo verificar tu identidad. Inicia sesión nuevamente.",
        variant: "destructive"
      });
      return null;
    }
    
    return user;
  };

  const generateAvatarFileName = (file: File, userId: string): string => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    return `avatar-${userId}-${timestamp}.${fileExt}`;
  };

  const ensureAvatarsBucket = async () => {
    try {
      // Check if bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      
      const avatarsBucket = buckets?.find(b => b.id === 'avatars');
      if (avatarsBucket) {
        console.log('✅ Avatars bucket exists');
        return;
      }

      // Create bucket if it doesn't exist
      console.log('🪣 Creating avatars bucket...');
      const { error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) throw createError;
      console.log('✅ Avatars bucket created');
      
    } catch (error) {
      console.warn('⚠️ Bucket check/creation failed, continuing with upload:', error);
    }
  };

  const uploadWithRetry = async (file: File, fileName: string, maxRetries = 2) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt}/${maxRetries}`);
        
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          // Handle RLS issues with simplified filename
          if ((error.message.includes('row-level security') || 
               error.message.includes('policy')) && attempt < maxRetries) {
            console.log('🔄 RLS error, trying simplified filename...');
            const simpleFileName = `avatar-${Date.now()}.${fileName.split('.').pop()}`;
            
            const retryResult = await uploadWithRetry(file, simpleFileName, 1);
            if (retryResult.success) {
              return retryResult;
            }
          }
          throw error;
        }

        return { success: true, fileName, data };
        
      } catch (error: any) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          return { success: false, error: error.message };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return { success: false, error: "All upload attempts failed" };
  };

  const getUploadErrorMessage = (error: any): string => {
    if (error.message?.includes('row-level security')) {
      return "Error de permisos. Verifica tu configuración de almacenamiento.";
    }
    if (error.message?.includes('File size')) {
      return "La imagen es demasiado grande. Máximo 5MB.";
    }
    if (error.message?.includes('network')) {
      return "Error de conexión. Verifica tu internet e inténtalo de nuevo.";
    }
    return error.message || "Error desconocido al subir la imagen.";
  };

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
