// Solución para el error "Invalid Refresh Token"
// Agregar este código en tu aplicación

// 1. Configuración mejorada de Supabase
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Configuración para manejar tokens expirados
      flowType: 'pkce'
    }
  }
)

// 2. Manejador global de errores de autenticación
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth event:', event)
  
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    // Token refrescado exitosamente
    if (event === 'TOKEN_REFRESHED') {
      console.log('✅ Token refrescado correctamente')
    }
  }
  
  if (event === 'SIGNED_OUT') {
    // Usuario cerrado, redirigir al login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
  }
})

// 3. Función para manejar errores de refresh token
async function handleAuthError(error) {
  console.error('Error de autenticación:', error)
  
  if (error.message?.includes('Invalid Refresh Token') || 
      error.message?.includes('Refresh Token Not Found')) {
    
    // Limpiar sesión y redirigir
    await supabase.auth.signOut()
    
    // Limpiar localStorage
    localStorage.clear()
    sessionStorage.clear()
    
    // Mostrar mensaje al usuario
    alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
    
    // Redirigir al login
    window.location.href = '/login'
  }
}

// 4. Interceptor global para errores no manejados
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Invalid Refresh Token') ||
      event.reason?.message?.includes('Refresh Token Not Found')) {
    
    event.preventDefault()
    handleAuthError(event.reason)
  }
})

// 5. Función para validar sesión al cargar la app
async function validateSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error obteniendo sesión:', error)
      await handleAuthError(error)
      return null
    }
    
    if (!session) {
      console.log('No hay sesión activa')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return null
    }
    
    console.log('✅ Sesión válida')
    return session
    
  } catch (error) {
    console.error('Error validando sesión:', error)
    await handleAuthError(error)
    return null
  }
}

// 6. Función para refrescar sesión manualmente
async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Error refrescando sesión:', error)
      await handleAuthError(error)
      return null
    }
    
    console.log('✅ Sesión refrescada manualmente')
    return data.session
    
  } catch (error) {
    console.error('Error en refresh manual:', error)
    await handleAuthError(error)
    return null
  }
}

// 7. Exportar funciones para usar en la app
export { supabase, validateSession, refreshSession, handleAuthError }

// 8. Validar sesión al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  validateSession()
})
