// 🚀 CONFIGURACIÓN DE STORAGE VIA API
// Ejecuta: node setup_storage_api.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://epqalebkqmkddlfomnyf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no encontrada');
  console.log('📝 Configura la variable de entorno:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupStorage() {
  try {
    console.log('🚀 Configurando storage de avatares...');

    // 1. Crear bucket
    console.log('📦 Creando bucket avatars...');
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket avatars ya existe');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Bucket avatars creado');
    }

    // 2. Verificar bucket
    console.log('🔍 Verificando bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const avatarsBucket = buckets.find(b => b.id === 'avatars');
    if (avatarsBucket) {
      console.log('✅ Bucket encontrado:', {
        id: avatarsBucket.id,
        public: avatarsBucket.public,
        fileSizeLimit: avatarsBucket.file_size_limit
      });
    }

    // 3. Test upload
    console.log('🧪 Probando upload...');
    const testContent = 'test file';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    const { data: upload, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload('test.txt', testFile);

    if (uploadError) {
      console.warn('⚠️ Test upload falló:', uploadError.message);
    } else {
      console.log('✅ Test upload exitoso');
      // Limpiar archivo de prueba
      await supabase.storage.from('avatars').remove(['test.txt']);
    }

    console.log('🎉 ¡Configuración completada!');
    console.log('📋 Próximos pasos:');
    console.log('1. Ve a Supabase Dashboard → Storage → Buckets');
    console.log('2. Verifica que existe el bucket "avatars"');
    console.log('3. Prueba subir un avatar en la app');

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

setupStorage();
