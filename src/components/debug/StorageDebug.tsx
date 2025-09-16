import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function StorageDebug() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStorage = async () => {
    setLoading(true);
    try {
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        throw bucketsError;
      }

      const avatarsBucket = bucketsData?.find(b => b.id === 'avatars');
      
      if (!avatarsBucket) {
        toast({
          title: "⚠️ Bucket 'avatars' no encontrado",
          description: "El bucket 'avatars' no existe. Usa 'COPY SQL' para crearlo.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Bucket 'avatars' existe",
          description: "Storage configurado correctamente.",
        });
      }

    } catch (error: any) {
      console.error('Storage check error:', error);
      toast({
        title: "Storage check failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copySQLToClipboard = async () => {
    const sqlCommands = `-- 🚀 CONFIGURAR STORAGE DE AVATARES
-- Ejecuta en Supabase Dashboard → SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);`;

    try {
      await navigator.clipboard.writeText(sqlCommands);
      toast({
        title: "📋 SQL copiado",
        description: "Pega en Supabase Dashboard → SQL Editor",
      });
    } catch (error) {
      toast({
        title: "❌ Error al copiar",
        description: "Revisa la consola para los comandos.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Storage Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Herramientas para configurar storage de avatares.
        </p>
        
        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkStorage} disabled={loading}>
            {loading ? 'Checking...' : 'Check Storage'}
          </Button>
          <Button onClick={copySQLToClipboard} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            📋 COPY SQL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}