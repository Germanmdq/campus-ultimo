// Manejador global de errores de autenticación
import { supabase } from '@/integrations/supabase/client';

// Función para manejar errores de refresh token
export async function handleAuthError(error: any) {
  console.error('Error de autenticación:', error);
  
  if (error.message?.includes('Invalid Refresh Token') || 
      error.message?.includes('Refresh Token Not Found')) {
    
    // Limpiar sesión y redirigir
    await supabase.auth.signOut();
    
    // Limpiar localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Mostrar mensaje al usuario
    alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    
    // Redirigir al login
    window.location.href = '/login';
  }
}

// Interceptor global para errores no manejados
export function setupAuthErrorInterceptor() {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('Invalid Refresh Token') ||
        event.reason?.message?.includes('Refresh Token Not Found')) {
      
      event.preventDefault();
      handleAuthError(event.reason);
    }
  });
}

// Función para validar sesión
export async function validateSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error obteniendo sesión:', error);
      await handleAuthError(error);
      return null;
    }
    
    if (!session) {
      console.log('No hay sesión activa');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return null;
    }
    
    console.log('✅ Sesión válida');
    return session;
    
  } catch (error) {
    console.error('Error validando sesión:', error);
    await handleAuthError(error);
    return null;
  }
}
