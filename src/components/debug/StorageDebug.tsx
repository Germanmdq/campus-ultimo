import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createAvatarsBucket } from '@/utils/createBucket';

export function StorageDebug() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStorage = async () => {
    setLoading(true);
    try {
      console.log('🔍 Checking storage configuration...');
      
      // List all buckets
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        throw bucketsError;
      }

      console.log('📦 Available buckets:', bucketsData);
      setBuckets(bucketsData || []);

      // Check if avatars bucket exists
      const avatarsBucket = bucketsData?.find(b => b.id === 'avatars');
      
      if (!avatarsBucket) {
        console.log('📦 Creating avatars bucket...');
        const { error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error('❌ Error creating avatars bucket:', createError);
          throw createError;
        }
        console.log('✅ Avatars bucket created successfully');
        
        // Refresh buckets list
        const { data: newBucketsData } = await supabase.storage.listBuckets();
        setBuckets(newBucketsData || []);
      } else {
        console.log('✅ Avatars bucket already exists');
      }

      // Test upload to verify it works
      console.log('🧪 Testing upload to avatars bucket...');
      const testFile = new Blob(['test content'], { type: 'text/plain' });
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload('test-file.txt', testFile);
      
      if (uploadError) {
        console.error('❌ Upload test failed:', uploadError);
        throw uploadError;
      } else {
        console.log('✅ Upload test successful:', uploadData);
        // Clean up test file
        await supabase.storage.from('avatars').remove(['test-file.txt']);
      }
      
      toast({
        title: "Storage check completed",
        description: `Found ${bucketsData?.length || 0} buckets. Avatars: ✅ Working!`
      });

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

  const testUpload = async () => {
    setLoading(true);
    try {
      // Create a simple test file
      const testContent = 'test file content';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      
      const { error } = await supabase.storage
        .from('public')
        .upload('test/test.txt', testFile);

      if (error) {
        throw error;
      }

      toast({
        title: "Test upload successful",
        description: "Test file uploaded successfully"
      });

    } catch (error: any) {
      console.error('Test upload error:', error);
      toast({
        title: "Test upload failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-profiles`, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profiles check:', data);
        
        toast({
          title: "Profiles check completed",
          description: `Found ${data.data.totalProfiles} profiles, ${data.data.profilesWithNullNames.length} with null names`
        });
      } else {
        throw new Error('Failed to check profiles');
      }
    } catch (error: any) {
      console.error('Profiles check error:', error);
      toast({
        title: "Profiles check failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fixStoragePolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-storage-policies`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Storage policies fix:', data);
        
        toast({
          title: "Storage policies fixed",
          description: "RLS policies have been updated and buckets ensured"
        });
      } else {
        throw new Error('Failed to fix storage policies');
      }
    } catch (error: any) {
      console.error('Storage policies fix error:', error);
      toast({
        title: "Storage policies fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fixUserNames = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-user-names`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User names fix:', data);
        
        toast({
          title: "User names fixed",
          description: `Updated ${data.data.updated} user names out of ${data.data.total} profiles`
        });
      } else {
        throw new Error('Failed to fix user names');
      }
    } catch (error: any) {
      console.error('User names fix error:', error);
      toast({
        title: "User names fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const emergencyFixNames = async () => {
    setLoading(true);
    
    try {
      console.log('🔧 Starting emergency names fix...');
      
      // Get profiles with missing names using improved query
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .or('full_name.is.null,full_name.eq.,full_name.ilike.Usuario,full_name.ilike.Sin nombre');
    
      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`👥 Found ${profiles?.length || 0} profiles needing names`);
      
      if (!profiles || profiles.length === 0) {
        toast({
          title: "✅ No names to fix",
          description: "All profiles already have proper names!",
        });
        return;
      }

      // Get auth users with better error handling
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        throw authError;
      }

      const authUsersMap = new Map(
        authData?.users?.map(user => [user.id, user]) || []
      );
      
      let fixed = 0;
      let errors = 0;

      // Process in smaller batches to avoid overwhelming the database
      const BATCH_SIZE = 10;
      for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
        const batch = profiles.slice(i, i + BATCH_SIZE);
        
        await Promise.allSettled(
          batch.map(async (profile) => {
            try {
              const authUser = authUsersMap.get(profile.id);
              if (!authUser) {
                console.warn(`⚠️ No auth user found for profile ${profile.id}`);
                return;
              }

              const newName = extractUserName(authUser);
              
              if (newName && newName !== profile.full_name) {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                    full_name: newName,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', profile.id);

                if (updateError) {
                  console.error(`❌ Failed to update ${profile.id}:`, updateError);
                  errors++;
                } else {
                  fixed++;
                  console.log(`✅ Updated ${profile.id}: "${profile.full_name}" → "${newName}"`);
                }
              }
            } catch (error) {
              console.error(`❌ Error processing profile ${profile.id}:`, error);
              errors++;
            }
          })
        );
      }

      console.log(`🎯 Emergency names fix completed! Updated: ${fixed}, Errors: ${errors}`);
      
      toast({
        title: "🚨 EMERGENCY FIX COMPLETE",
        description: `Fixed ${fixed} names${errors > 0 ? `, ${errors} errors` : ''}`,
        variant: errors > 0 ? "destructive" : "default"
      });

    } catch (error: any) {
      console.error('💥 Emergency names fix error:', error);
      toast({
        title: "💥 Emergency fix failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract user name from auth metadata
  const extractUserName = (authUser: any): string => {
    const meta = authUser.user_metadata || {};
    const email = authUser.email || '';
    
    // Priority order for name sources
    const nameSources = [
      meta.full_name,
      meta.name,
      meta.display_name,
      meta.first_name && meta.last_name ? `${meta.first_name} ${meta.last_name}` : null,
      email ? email.split('@')[0] : null
    ];
    
    // Find first valid name
    for (const source of nameSources) {
      if (source && typeof source === 'string') {
        const cleaned = source.trim();
        if (cleaned && 
            cleaned !== 'Usuario' && 
            cleaned !== 'Sin nombre' &&
            cleaned.length > 0) {
          return cleaned;
        }
      }
    }
    
    return email ? email.split('@')[0] : 'Usuario';
  };

  const emergencyFixStorage = async () => {
    setLoading(true);
    try {
      console.log('🔧 Starting emergency storage fix directly...');
      
      // 1. Check existing buckets
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) throw listError;

      console.log('📦 Existing buckets:', existingBuckets?.map(b => ({ id: b.id, name: b.name, public: b.public })));

      // 2. Create avatars bucket if it doesn't exist
      let avatarsBucket = existingBuckets?.find(b => b.id === 'avatars');
      if (!avatarsBucket) {
        console.log('📦 Creating avatars bucket...');
        const { error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error('❌ Error creating avatars bucket:', createError);
          throw createError;
        }
        console.log('✅ Avatars bucket created');
      } else {
        console.log('✅ Avatars bucket already exists');
      }

      // 3. Test upload to verify it works
      console.log('🧪 Testing upload...');
      const testContent = 'emergency test file';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      
      const { data: testUpload, error: testError } = await supabase.storage
        .from('avatars')
        .upload('emergency-test.txt', testFile);

      if (testError) {
        console.error('❌ Test upload failed:', testError);
        throw testError;
      }

      console.log('✅ Test upload successful:', testUpload);

      // 4. Clean up test file
      await supabase.storage.from('avatars').remove(['emergency-test.txt']);

      console.log('✅ Emergency storage fix completed!');
      
      toast({
        title: "🚨 EMERGENCY STORAGE FIX COMPLETE",
        description: "Avatar uploads should now work! Check console for details.",
      });
    } catch (error: any) {
      console.error('💥 Emergency storage fix error:', error);
      toast({
        title: "💥 Emergency storage fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const emergencyFixAuth = async () => {
    setLoading(true);
    try {
      console.log('🔧 Starting emergency auth diagnostics directly...');
      
      // 1. Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Current session:', { hasSession: !!session, error: sessionError?.message });

      // 2. Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 Current user:', { hasUser: !!user, userId: user?.id, error: userError?.message });

      // 3. Test database connection
      const { data: dbTest, error: dbError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      console.log('🗄️ Database connection:', { success: !dbError, error: dbError?.message });

      // 4. Test storage access
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      console.log('📦 Storage access:', { success: !storageError, buckets: buckets?.length || 0, error: storageError?.message });

      // 5. Test storage upload
      if (!storageError) {
        const testContent = 'auth test file';
        const testFile = new Blob([testContent], { type: 'text/plain' });
        
        const { data: testUpload, error: testUploadError } = await supabase.storage
          .from('avatars')
          .upload('auth-test.txt', testFile);

        console.log('🧪 Storage upload test:', { success: !testUploadError, error: testUploadError?.message });

        // Clean up test file
        if (!testUploadError) {
          await supabase.storage.from('avatars').remove(['auth-test.txt']);
        }
      }

      console.log('✅ Emergency auth diagnostics completed');
      
      toast({
        title: "🚨 EMERGENCY AUTH DIAGNOSTICS COMPLETE",
        description: "Check console for detailed auth diagnostics.",
      });
    } catch (error: any) {
      console.error('💥 Emergency auth fix error:', error);
      toast({
        title: "💥 Emergency auth fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createBucketNow = async () => {
    setLoading(true);
    try {
      console.log('🔧 Attempting to create avatars bucket...');
      
      // Intentar crear bucket directamente (solo funciona con service_role)
      const { error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.warn('⚠️ Cannot create bucket directly:', createError);
        showManualSetupInstructions();
        return;
      }

      console.log('✅ Bucket created successfully');
      
      // Refresh buckets list
      const { data: newBucketsData } = await supabase.storage.listBuckets();
      setBuckets(newBucketsData || []);
      
      toast({
        title: "✅ BUCKET CREATED",
        description: "Avatars bucket created successfully! Avatar uploads should now work."
      });
    } catch (error: any) {
      console.error('💥 Bucket creation error:', error);
      showManualSetupInstructions();
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FUNCIÓN DE DIAGNÓSTICO PARA ADMINISTRADORES
  const diagnoseStorageSetup = async () => {
    setLoading(true);
    try {
      console.log('🔍 Running storage setup diagnosis...');
      
      // Usar la función SQL especializada para verificar configuración
      const { data: configData, error: configError } = await supabase.rpc('check_storage_config');
      
      if (configError) {
        console.error('❌ Config check failed:', configError);
        throw configError;
      }

      console.log('📊 Storage configuration:', configData);

      // Actualizar lista de buckets
      const { data: bucketsData } = await supabase.storage.listBuckets();
      setBuckets(bucketsData || []);

      // Mostrar resultado según el estado
      switch (configData.status) {
        case 'configured':
          toast({
            title: "✅ Configuración completa",
            description: "Storage de avatars está configurado correctamente.",
          });
          console.log('✅ Storage is fully configured');
          break;
          
        case 'bucket_only':
          toast({
            title: "⚠️ Configuración parcial",
            description: "Bucket existe pero faltan políticas RLS. Usa AUTO SETUP.",
            variant: "destructive"
          });
          console.log('⚠️ Bucket exists but policies are missing');
          break;
          
        case 'not_configured':
          toast({
            title: "❌ No configurado",
            description: "Storage no está configurado. Usa AUTO SETUP para configurar.",
            variant: "destructive"
          });
          console.log('❌ Storage is not configured');
          break;
          
        case 'error':
          toast({
            title: "💥 Error de diagnóstico",
            description: "Error al verificar configuración. Revisa la consola.",
            variant: "destructive"
          });
          console.log('💥 Error during diagnosis');
          break;
      }

      // Mostrar detalles en consola
      console.log('📋 Bucket info:', configData.bucket);
      console.log('📊 Policies count:', configData.policies_count);

    } catch (error: any) {
      console.error('💥 Diagnosis failed:', error);
      toast({
        title: "💥 Error de diagnóstico",
        description: error.message || "Error desconocido durante el diagnóstico",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 📋 MOSTRAR INSTRUCCIONES DE CONFIGURACIÓN
  const showSetupInstructions = () => {
    console.log(`
🔧 SUPABASE STORAGE SETUP REQUIRED

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the following commands:

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

4. After running these commands, try uploading again.
    `);
    
    toast({
      title: "📋 Instrucciones mostradas",
      description: "Revisa la consola para ver los comandos SQL necesarios.",
    });
  };

  // 🛠️ CONFIGURACIÓN MANUAL RECOMENDADA
  const showManualSetupInstructions = () => {
    const setup = `
🔧 CONFIGURACIÓN MANUAL RECOMENDADA

=== OPCIÓN 1: Interfaz Web ===
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a Storage → Buckets
4. Click "New bucket"
5. Nombre: avatars
6. Público: ✅ Habilitado
7. Límite: 5MB
8. Tipos permitidos: image/jpeg, image/png, image/webp, image/gif

=== OPCIÓN 2: SQL Editor ===
1. Ve a SQL Editor en Supabase
2. Ejecuta:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

=== POLÍTICAS RLS (Opcional pero recomendado) ===
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);
    `;
    
    console.log(setup);
    
    toast({
      title: "🛠️ Configuración manual requerida",
      description: "Revisa la consola para ver las instrucciones detalladas.",
      variant: "destructive"
    });
  };

  // 🚀 EJECUTAR CONFIGURACIÓN AUTOMÁTICA VIA SQL
  const executeAutoSetup = async () => {
    setLoading(true);
    try {
      console.log('🚀 Attempting automatic storage setup...');
      
      // Usar la función SQL especializada para configurar storage
      const { data, error } = await supabase.rpc('setup_avatars_storage');
      
      if (error) {
        console.error('❌ Setup function failed:', error);
        throw error;
      }

      console.log('✅ Setup function result:', data);

      if (data.success) {
        // Refresh buckets list
        const { data: newBucketsData } = await supabase.storage.listBuckets();
        setBuckets(newBucketsData || []);
        
        toast({
          title: "✅ Configuración exitosa",
          description: "Storage de avatars configurado correctamente. Bucket y políticas creadas.",
        });
        
        console.log('🎯 Storage setup completed successfully');
        console.log('📊 Bucket result:', data.bucket);
        console.log('📊 Policies result:', data.policies);
      } else {
        throw new Error(data.error || 'Setup failed');
      }

    } catch (error: any) {
      console.error('💥 Auto setup failed:', error);
      
      // Si falla la configuración automática, mostrar instrucciones manuales
      showManualSetupInstructions();
      
      toast({
        title: "⚠️ Configuración automática falló",
        description: "Usa las instrucciones manuales en la consola.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 📋 COPIAR COMANDOS SQL AL PORTAPAPELES
  const copySQLToClipboard = async () => {
    const sqlCommands = `-- 🚀 CONFIGURACIÓN COMPLETA DE STORAGE PARA AVATARES
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear políticas RLS para avatars

-- Política de lectura pública (para mostrar avatares)
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

-- Política de subida para usuarios autenticados
CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Política de actualización para propietarios
CREATE POLICY "Users can update their own avatars" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);

-- Política de eliminación para propietarios
CREATE POLICY "Users can delete their own avatars" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);

-- 3. Verificar que se creó correctamente
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- 4. Verificar políticas creadas
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';

-- ✅ CONFIGURACIÓN COMPLETA
-- El bucket 'avatars' ahora está configurado con:
-- - Lectura pública para mostrar avatares
-- - Subida para usuarios autenticados
-- - Actualización/eliminación solo para propietarios
-- - Límite de 5MB por archivo
-- - Tipos MIME permitidos: jpeg, png, webp, gif`;

    try {
      await navigator.clipboard.writeText(sqlCommands);
      toast({
        title: "📋 Comandos copiados",
        description: "Los comandos SQL completos se copiaron al portapapeles. Pégalos en el SQL Editor de Supabase.",
      });
      console.log('📋 Complete SQL commands copied to clipboard');
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
      toast({
        title: "❌ Error al copiar",
        description: "No se pudo copiar al portapapeles. Revisa la consola para los comandos.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Storage Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">🚨 EMERGENCY FIXES</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={emergencyFixNames} disabled={loading} className="bg-red-600 hover:bg-red-700">
                {loading ? 'Fixing...' : '🚨 FIX NAMES NOW'}
              </Button>
              <Button onClick={emergencyFixStorage} disabled={loading} className="bg-red-600 hover:bg-red-700">
                {loading ? 'Fixing...' : '🚨 FIX STORAGE NOW'}
              </Button>
              <Button onClick={emergencyFixAuth} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? 'Checking...' : '🔐 CHECK AUTH'}
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">🔧 QUICK FIXES</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={createBucketNow} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? 'Creating...' : '🔧 CREATE BUCKET NOW'}
              </Button>
              <Button onClick={diagnoseStorageSetup} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? 'Diagnosing...' : '🔍 DIAGNOSE STORAGE'}
              </Button>
              <Button onClick={showSetupInstructions} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                📋 SHOW SQL COMMANDS
              </Button>
              <Button onClick={executeAutoSetup} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? 'Setting up...' : '🚀 AUTO SETUP'}
              </Button>
              <Button onClick={copySQLToClipboard} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                📋 COPY SQL
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button onClick={checkStorage} disabled={loading}>
              {loading ? 'Checking...' : 'Setup Storage'}
            </Button>
            <Button onClick={fixStoragePolicies} disabled={loading} variant="outline">
              {loading ? 'Fixing...' : 'Fix Storage Policies'}
            </Button>
            <Button onClick={fixUserNames} disabled={loading} variant="outline">
              {loading ? 'Fixing...' : 'Fix User Names'}
            </Button>
            <Button onClick={testUpload} disabled={loading} variant="outline">
              {loading ? 'Testing...' : 'Test Upload'}
            </Button>
            <Button onClick={checkProfiles} disabled={loading} variant="outline">
              {loading ? 'Checking...' : 'Check Profiles'}
            </Button>
          </div>
        </div>

        {buckets.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Available Buckets:</h3>
            <div className="space-y-2">
              {buckets.map((bucket, index) => (
                <div key={index} className="p-2 border rounded">
                  <p><strong>Name:</strong> {bucket.name}</p>
                  <p><strong>Public:</strong> {bucket.public ? 'Yes' : 'No'}</p>
                  <p><strong>Created:</strong> {new Date(bucket.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
          <p>This debug component will help identify storage configuration issues.</p>
        </div>
      </CardContent>
    </Card>
  );
}
