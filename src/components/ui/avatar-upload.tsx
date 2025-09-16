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
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "La imagen debe ser menor a 5MB",
        variant: "destructive"
      })
      return
    }

    setUploading(true)

    try {
      // Check and refresh session if needed
      const sessionValid = await checkAndRefreshSession()
      if (!sessionValid) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar logueado para subir una foto. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        })
        return
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Auth error:', authError)
        toast({
          title: "Error de autenticación",
          description: "No se pudo verificar tu identidad. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        })
        return
      }

      console.log('User authenticated:', user.id)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`

      console.log('Attempting upload to avatars bucket...', fileName)
      
      // Ensure avatars bucket exists
      console.log('Ensuring avatars bucket exists...')
      const bucketCreated = await ensureAvatarsBucket()
      if (!bucketCreated) {
        throw new Error('Failed to create avatars bucket')
      }

      // Try to upload directly to avatars bucket
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting
        })

      if (error) {
        console.error('Upload failed:', error)
        
        // If RLS error, try with a simpler filename
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          console.log('RLS error detected, trying with simpler filename...')
          const simpleFileName = `avatar-${Date.now()}.${fileExt}`
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from('avatars')
            .upload(simpleFileName, file, {
              cacheControl: '3600',
              upsert: true
            })

          if (retryError) {
            console.error('Retry upload failed:', retryError)
            throw retryError
          }

          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(simpleFileName)

          console.log('Retry upload successful:', urlData.publicUrl)
          onChange?.(urlData.publicUrl)
          
          toast({
            title: "Foto actualizada",
            description: "Tu foto de perfil fue actualizada exitosamente"
          })
          return
        }
        
        throw error
      }

      console.log('Upload successful:', data)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      console.log('Public URL:', urlData.publicUrl)

      onChange?.(urlData.publicUrl)
      
      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil fue actualizada exitosamente"
      })
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la imagen. Verifica que el almacenamiento esté configurado correctamente.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

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
