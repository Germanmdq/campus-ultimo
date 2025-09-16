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

  // 🔍 FUNCIÓN DE DEBUG PARA ARREGLAR NOMBRES
  const debugFixNames = async () => {
    console.log('🚀 Iniciando debug de nombres...');
    
    try {
      // 1. Ver qué perfiles tenemos
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(10);
      
      if (profilesError) {
        console.error('❌ Error obteniendo profiles:', profilesError);
        return;
      }

      console.log('👥 PROFILES ENCONTRADOS:');
      profiles?.forEach(p => {
        console.log(`  - ${p.id}: "${p.full_name}"`);
      });

      // 2. Ver usuarios de auth
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.error('❌ Error obteniendo auth users:', authError);
        return;
      }

      console.log('\n🔐 AUTH USERS ENCONTRADOS:');
      authData.users?.slice(0, 5).forEach(u => {
        console.log(`  - ${u.id}: ${u.email}`);
        console.log(`    metadata:`, u.user_metadata);
        console.log(`    raw_metadata:`, u.raw_user_meta_data);
        console.log('    ---');
      });

      // 3. Encontrar perfiles que necesitan nombres
      const profilesNeedingNames = profiles?.filter(p => 
        !p.full_name || 
        p.full_name === '' || 
        p.full_name === 'Usuario' ||
        p.full_name === 'Sin nombre'
      );

      console.log(`\n🎯 PERFILES QUE NECESITAN NOMBRES: ${profilesNeedingNames?.length || 0}`);
      profilesNeedingNames?.forEach(p => {
        console.log(`  - ${p.id}: "${p.full_name}"`);
      });

      // 4. Intentar actualizar uno por uno
      if (profilesNeedingNames && profilesNeedingNames.length > 0) {
        console.log('\n🔧 INTENTANDO ACTUALIZAR...');
        
        for (const profile of profilesNeedingNames) {
          const authUser = authData.users?.find(u => u.id === profile.id);
          if (!authUser) {
            console.log(`⚠️ No se encontró auth user para ${profile.id}`);
            continue;
          }

          // Extraer nombre
          const metadata = authUser.user_metadata || {};
          const rawMetadata = authUser.raw_user_meta_data || {};
          
          let newName = rawMetadata.full_name || metadata.full_name || authUser.email?.split('@')[0] || 'Usuario';
          
          console.log(`🔄 Procesando ${profile.id}:`);
          console.log(`   Email: ${authUser.email}`);
          console.log(`   Metadata full_name: ${metadata.full_name}`);
          console.log(`   Raw metadata full_name: ${rawMetadata.full_name}`);
          console.log(`   Nombre calculado: "${newName}"`);

          if (newName && newName !== profile.full_name) {
            console.log(`   🔄 Intentando actualizar...`);
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ full_name: newName })
              .eq('id', profile.id);

            if (updateError) {
              console.error(`   ❌ Error actualizando:`, updateError);
            } else {
              console.log(`   ✅ Actualizado exitosamente`);
            }
          } else {
            console.log(`   ⏭️ No necesita actualización`);
          }
          console.log('   ---');
        }
      }

      console.log('🏁 Debug completado');

    } catch (error) {
      console.error('💥 Error en debug:', error);
    }
  };

  // 🔍 FUNCIÓN SIMPLE PARA VER QUÉ HAY EN PROFILES
  const checkProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('PROFILES:', data);
  };

  // 🔍 FUNCIÓN PARA PROBAR UNA ACTUALIZACIÓN SIMPLE
  const testSimpleUpdate = async () => {
    try {
      // Obtener el primer perfil
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(1);
        
      if (error || !profiles?.length) {
        console.error('No se pudieron obtener profiles');
        return;
      }
      
      const profile = profiles[0];
      console.log('Profile a actualizar:', profile);
      
      // Intentar actualización simple
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: 'TEST UPDATE' })
        .eq('id', profile.id);
        
      if (updateError) {
        console.error('Error en update:', updateError);
      } else {
        console.log('✅ Update exitoso');
        
        // Revertir
        await supabase
          .from('profiles')
          .update({ full_name: profile.full_name })
          .eq('id', profile.id);
      }
      
    } catch (error) {
      console.error('Error:', error);
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

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-800 mb-2">🔍 DEBUG FUNCTIONS</h3>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={debugFixNames} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              🔍 DEBUG NAMES
            </Button>
            <Button onClick={checkProfiles} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              👥 CHECK PROFILES
            </Button>
            <Button onClick={testSimpleUpdate} disabled={loading} className="bg-pink-600 hover:bg-pink-700">
              🧪 TEST UPDATE
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}