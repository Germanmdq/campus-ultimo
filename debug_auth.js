// Script para diagnosticar problemas de autenticación
console.log('🔍 Iniciando diagnóstico de autenticación...');

// Verificar configuración de Supabase
const SUPABASE_URL = "https://epqalebkqmkddlfomnyf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWFsZWJrcW1rZGRsZm9tbnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY2NzksImV4cCI6MjA3MjU2MjY3OX0.ER4376BoXZfLvFu4ERbPmNs1O16mhyqjj9E06ZBvTg0";

console.log('📡 URL de Supabase:', SUPABASE_URL);
console.log('🔑 Clave pública:', SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...');

// Verificar localStorage
console.log('💾 Verificando localStorage...');
const supabaseKeys = Object.keys(localStorage).filter(key => 
  key.includes('supabase') || key.startsWith('sb-')
);
console.log('🔑 Keys de Supabase encontradas:', supabaseKeys);

// Verificar tokens
supabaseKeys.forEach(key => {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      console.log(`📄 ${key}:`, {
        hasExpiresAt: !!parsed?.expires_at,
        expiresAt: parsed?.expires_at,
        isExpired: parsed?.expires_at ? parsed.expires_at < Math.floor(Date.now() / 1000) : 'N/A'
      });
    }
  } catch (e) {
    console.log(`❌ Error parseando ${key}:`, e.message);
  }
});

// Probar conexión a Supabase
console.log('🌐 Probando conexión a Supabase...');
fetch(`${SUPABASE_URL}/rest/v1/`, {
  headers: {
    'apikey': SUPABASE_PUBLISHABLE_KEY,
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
  }
})
.then(response => {
  console.log('✅ Respuesta de Supabase:', response.status, response.statusText);
  return response.text();
})
.then(data => {
  console.log('📄 Datos de respuesta:', data.substring(0, 200) + '...');
})
.catch(error => {
  console.error('❌ Error conectando a Supabase:', error);
});

console.log('✅ Diagnóstico completado');
