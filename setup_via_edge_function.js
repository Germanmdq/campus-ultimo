// 🚀 CONFIGURACIÓN VIA EDGE FUNCTION
// Ejecuta: node setup_via_edge_function.js

const SUPABASE_URL = 'https://epqalebkqmkddlfomnyf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWFsZWJrcW1rZGRsZm9tbnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4MDAsImV4cCI6MjA1MDA1MDgwMH0.placeholder';

async function setupViaEdgeFunction() {
  try {
    console.log('🚀 Configurando storage via Edge Function...');

    // Llamar a la función setup-storage
    const response = await fetch(`${SUPABASE_URL}/functions/v1/setup-storage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta de la función:', data);

    if (data.success) {
      console.log('🎉 ¡Storage configurado exitosamente!');
      console.log('📊 Buckets creados:', data.data.createdBuckets);
      console.log('📊 Buckets existentes:', data.data.existingBuckets);
    } else {
      console.error('❌ Error en la configuración:', data.error);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.log('📝 Alternativas:');
    console.log('1. Ejecuta setup_avatars_storage.sql en SQL Editor');
    console.log('2. Usa el botón "COPY SQL" en la app');
    console.log('3. Configura manualmente en Supabase Dashboard');
  }
}

setupViaEdgeFunction();
