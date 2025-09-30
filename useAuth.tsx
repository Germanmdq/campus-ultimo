// Hook personalizado para manejar autenticación con Supabase
// Reemplaza tu hook useAuth actual con este

import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error obteniendo sesión inicial:', error)
          // Si hay error, limpiar y redirigir
          await supabase.auth.signOut()
          setUser(null)
          setSession(null)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Error en getInitialSession:', error)
        setUser(null)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event)
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Manejar eventos específicos
        if (event === 'SIGNED_OUT') {
          // Limpiar estado local
          setUser(null)
          setSession(null)
          
          // Redirigir al login si no estamos ya ahí
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refrescado exitosamente')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error cerrando sesión:', error)
      }
      
      // Limpiar estado local
      setUser(null)
      setSession(null)
      
      // Limpiar localStorage
      localStorage.clear()
      sessionStorage.clear()
      
    } catch (error) {
      console.error('Error en signOut:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para refrescar sesión manualmente
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refrescando sesión:', error)
        // Si falla el refresh, cerrar sesión
        await signOut()
        return null
      }
      
      return data.session
    } catch (error) {
      console.error('Error en refreshSession:', error)
      await signOut()
      return null
    }
  }

  return {
    user,
    session,
    loading,
    signOut,
    refreshSession
  }
}
