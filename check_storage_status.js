// 🔍 VERIFICAR ESTADO DEL STORAGE
// Ejecuta: node check_storage_status.js

const SUPABASE_URL = 'https://epqalebkqmkddlfomnyf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWFsZWJrcW1rZGRsZm9tbnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY2NzksImV4cCI6MjA3MjU2MjY3OX0.ER4376BoXZfLvFu4ERbPmNs1O16mhyqjj9E06ZBvTg0';

async function checkStorageStatus() {
  try {
    console.log('🔍 Verificando estado del storage...');

    // Verificar buckets
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buckets = await response.json();
    console.log('📦 Buckets encontrados:', buckets.length);
    
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.id}: ${bucket.name} (Público: ${bucket.public})`);
    });

    // Verificar si existe bucket avatars
    const avatarsBucket = buckets.find(b => b.id === 'avatars');
    if (avatarsBucket) {
      console.log('✅ Bucket avatars existe');
      console.log('📊 Configuración:', {
        public: avatarsBucket.public,
        fileSizeLimit: avatarsBucket.file_size_limit,
        allowedMimeTypes: avatarsBucket.allowed_mime_types
      });
    } else {
      console.log('❌ Bucket avatars NO existe');
      console.log('📝 Para crearlo:');
      console.log('1. Ve a Supabase Dashboard → SQL Editor');
      console.log('2. Ejecuta setup_avatars_storage.sql');
      console.log('3. O usa el botón "COPY SQL" en la app');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.log('📝 Verifica que:');
    console.log('1. La URL de Supabase sea correcta');
    console.log('2. La clave anónima sea válida');
    console.log('3. El proyecto esté activo');
  }
}

checkStorageStatus();
