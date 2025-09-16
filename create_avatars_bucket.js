// 🚀 CREAR BUCKET AVATARS VIA API
// Ejecuta: node create_avatars_bucket.js

const SUPABASE_URL = 'https://epqalebkqmkddlfomnyf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWFsZWJrcW1rZGRsZm9tbnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY2NzksImV4cCI6MjA3MjU2MjY3OX0.ER4376BoXZfLvFu4ERbPmNs1O16mhyqjj9E06ZBvTg0';

async function createAvatarsBucket() {
  try {
    console.log('🚀 Creando bucket avatars...');

    // Crear bucket usando la API de Storage
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: 'avatars',
        name: 'avatars',
        public: true,
        file_size_limit: 5242880, // 5MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error creando bucket:', response.status, errorText);
      
      if (response.status === 409) {
        console.log('ℹ️ El bucket ya existe');
      } else if (response.status === 403) {
        console.log('🔒 Error de permisos. Necesitas usar la clave de servicio');
        console.log('📝 Alternativas:');
        console.log('1. Ve a Supabase Dashboard → SQL Editor');
        console.log('2. Ejecuta setup_avatars_storage.sql');
        console.log('3. O usa el botón "COPY SQL" en la app');
      }
      return;
    }

    const data = await response.json();
    console.log('✅ Bucket creado exitosamente:', data);

    // Verificar que se creó
    console.log('🔍 Verificando bucket...');
    const checkResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (checkResponse.ok) {
      const buckets = await checkResponse.json();
      const avatarsBucket = buckets.find(b => b.id === 'avatars');
      if (avatarsBucket) {
        console.log('✅ Bucket avatars verificado:', {
          id: avatarsBucket.id,
          public: avatarsBucket.public,
          fileSizeLimit: avatarsBucket.file_size_limit
        });
      }
    }

    console.log('🎉 ¡Bucket avatars creado exitosamente!');
    console.log('📋 Próximos pasos:');
    console.log('1. Ve a Supabase Dashboard → Storage → Buckets');
    console.log('2. Verifica que existe el bucket "avatars"');
    console.log('3. Prueba subir un avatar en la app');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.log('📝 Alternativas:');
    console.log('1. Ejecuta setup_avatars_storage.sql en SQL Editor');
    console.log('2. Usa el botón "COPY SQL" en la app');
    console.log('3. Configura manualmente en Supabase Dashboard');
  }
}

createAvatarsBucket();
