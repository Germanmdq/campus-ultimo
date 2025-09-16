import * as React from "react"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

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
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // First, try to list buckets to see what's available
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError)
        throw new Error('No se pudo acceder al almacenamiento')
      }

      console.log('Available buckets:', buckets?.map(b => b.name))

      // Try different bucket names in order of preference
      const bucketNames = ['assets', 'public', 'avatars', 'uploads']
      let bucketName = null
      let uploadError = null

      for (const bucket of bucketNames) {
        const bucketExists = buckets?.some(b => b.name === bucket)
        if (bucketExists) {
          console.log(`Trying to upload to bucket: ${bucket}`)
          const { error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (!error) {
            bucketName = bucket
            break
          } else {
            console.error(`Error uploading to ${bucket}:`, error)
            uploadError = error
          }
        }
      }

      if (!bucketName) {
        // If no bucket worked, try creating a public bucket
        console.log('No existing bucket worked, trying to create public bucket')
        const { error: createError } = await supabase.storage.createBucket('public', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880 // 5MB
        })

        if (!createError) {
          const { error } = await supabase.storage
            .from('public')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (!error) {
            bucketName = 'public'
          } else {
            uploadError = error
          }
        } else {
          uploadError = createError
        }
      }

      if (!bucketName || uploadError) {
        throw uploadError || new Error('No se pudo subir la imagen a ningún bucket disponible')
      }

      // Get public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      console.log('Upload successful to bucket:', bucketName)
      console.log('Public URL:', data.publicUrl)

      onChange?.(data.publicUrl)
      
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
