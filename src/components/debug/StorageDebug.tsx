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

  // 🔧 FUNCIÓN SIMPLE PARA ARREGLAR NOMBRES
  const fixUserNames = async () => {
    setLoading(true);
    
    try {
      console.log('🔧 Iniciando arreglo de nombres...');
      
      // 1. Obtener perfiles sin nombres
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .or('full_name.is.null,full_name.eq.,full_name.eq.Usuario');
      
      if (profilesError) {
        throw profilesError;
      }

      console.log(`👥 Encontrados ${profiles?.length || 0} perfiles sin nombres`);
      
      if (!profiles || profiles.length === 0) {
        toast({
          title: "✅ Completado",
          description: "Todos los perfiles ya tienen nombres",
        });
        return;
      }

      // 2. Obtener datos de autenticación
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        throw authError;
      }

      let fixed = 0;

      // 3. Procesar cada perfil
      for (const profile of profiles) {
        const authUser = users?.find(u => u.id === profile.id);
        if (!authUser) continue;

        // Extraer nombre del usuario
        let newName = '';
        
        // Los datos están en raw_user_meta_data
        const metadata = authUser.user_metadata || authUser.raw_user_meta_data || {};
        
        // Prioridad 1: full_name en metadata
        if (metadata.full_name) {
          newName = metadata.full_name;
        }
        // Prioridad 2: nombre + apellido
        else if (metadata.first_name && metadata.last_name) {
          newName = `${metadata.first_name} ${metadata.last_name}`;
        }
        // Prioridad 3: solo nombre
        else if (metadata.name) {
          newName = metadata.name;
        }
        // Prioridad 4: email sin dominio
        else if (authUser.email) {
          newName = authUser.email.split('@')[0];
        }

        // Limpiar y validar nombre
        newName = newName.trim();
        if (!newName || newName === 'Usuario') {
          newName = authUser.email ? authUser.email.split('@')[0] : 'Usuario';
        }

        // Actualizar perfil
        if (newName && newName !== profile.full_name) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ full_name: newName })
            .eq('id', profile.id);

          if (!updateError) {
            fixed++;
            console.log(`✅ Actualizado ${profile.id}: "${newName}"`);
          } else {
            console.error(`❌ Error actualizando ${profile.id}:`, updateError);
          }
        }
      }

      console.log(`✅ Proceso completado! Arreglados: ${fixed} perfiles`);
      
      toast({
        title: "🎉 ¡Completado!",
        description: `Se arreglaron ${fixed} nombres de usuarios`,
      });

    } catch (error: any) {
      console.error('💥 Error:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Error al arreglar nombres",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 📧 FUNCIÓN ESPECÍFICA PARA ACTUALIZAR EMAIL EN PERFILES
  const syncEmailsToProfiles = async () => {
    setLoading(true);
    
    try {
      console.log('📧 Sincronizando emails...');
      
      // Obtener todos los perfiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');
      
      if (profilesError) throw profilesError;

      // Obtener usuarios de auth
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      let updated = 0;

      for (const profile of profiles || []) {
        const authUser = users?.find(u => u.id === profile.id);
        if (!authUser?.email) continue;

        // Solo actualizar si el email es diferente o está vacío
        if (profile.email !== authUser.email) {
          const { error } = await supabase
            .from('profiles')
            .update({ email: authUser.email })
            .eq('id', profile.id);

          if (!error) {
            updated++;
            console.log(`📧 Email actualizado para ${profile.full_name}: ${authUser.email}`);
          }
        }
      }

      toast({
        title: "📧 Emails sincronizados",
        description: `Se actualizaron ${updated} emails`,
      });

    } catch (error: any) {
      console.error('💥 Error sincronizando emails:', error);
      toast({
        title: "❌ Error",
        description: "Error al sincronizar emails",
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
        
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🔧 ARREGLAR USUARIOS</h3>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={fixUserNames} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700">
              {loading ? 'Arreglando...' : '🔧 FIX NAMES'}
            </Button>
            <Button onClick={syncEmailsToProfiles} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Sincronizando...' : '📧 SYNC EMAILS'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}