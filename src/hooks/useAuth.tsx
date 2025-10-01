import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../integrations/supabase/client'

interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'teacher' | 'student' | 'formador'
  email?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // ✅ Bandera para evitar procesamiento durante inicialización
  const isInitialized = useRef(false)
  const isFetchingProfile = useRef(false)
  const tokenRefreshCount = useRef(0)
  const lastRefreshTime = useRef(0)

  // Función para obtener el perfil del usuario
  const fetchProfile = async (userId: string) => {
    // Evitar múltiples fetches simultáneos
    if (isFetchingProfile.current) {
      console.log('Ya se está obteniendo el perfil, omitiendo...')
      return null
    }

    try {
      isFetchingProfile.current = true
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error obteniendo perfil:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error en fetchProfile:', error)
      return null
    } finally {
      isFetchingProfile.current = false
    }
  }

  useEffect(() => {
    let mounted = true
    let initTimeout: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        console.log('🔄 Inicializando autenticación...')
        
        // ✅ Timeout de seguridad: si la inicialización toma más de 10 segundos, hay un problema
        initTimeout = setTimeout(() => {
          if (!isInitialized.current) {
            console.error('🚨 TIMEOUT: Inicialización tomó demasiado tiempo. Limpiando...')
            localStorage.clear()
            sessionStorage.clear()
            if (mounted) {
              setUser(null)
              setSession(null)
              setProfile(null)
              setLoading(false)
              isInitialized.current = true
            }
          }
        }, 10000)
        
        // ✅ Verificar y limpiar tokens corruptos ANTES de getSession
        try {
          // Buscar todas las keys de Supabase en localStorage
          const supabaseKeys = Object.keys(localStorage).filter(key => 
            key.includes('supabase') || key.startsWith('sb-')
          )
          
          for (const key of supabaseKeys) {
            try {
              const data = localStorage.getItem(key)
              if (data) {
                const parsed = JSON.parse(data)
                
                // Verificar si tiene expires_at
                if (parsed?.expires_at || parsed?.expiresAt) {
                  const expiresAt = parsed.expires_at || parsed.expiresAt
                  const now = Math.floor(Date.now() / 1000)
                  
                  // Si expiró hace más de 1 hora, limpiar TODO
                  if (expiresAt < now - 3600) {
                    console.log('🧹 Token expirado encontrado en', key, '- limpiando todo localStorage')
                    localStorage.clear()
                    if (mounted) {
                      setUser(null)
                      setSession(null)
                      setProfile(null)
                      setLoading(false)
                      isInitialized.current = true
                    }
                    return
                  }
                }
              }
            } catch (e) {
              // Si falla el parse de alguna key, continuar
              continue
            }
          }
        } catch (e) {
          console.log('🧹 Error al verificar tokens, limpiando localStorage completo...')
          localStorage.clear()
          if (mounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
            setLoading(false)
            isInitialized.current = true
          }
          return
        }
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('❌ Error obteniendo sesión:', error)
          
          // Limpiar localStorage si hay error de refresh token
          if (error.message?.includes('Refresh Token') || 
              error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('400') || 
              error.status === 400) {
            console.log('🧹 Limpiando localStorage debido a token inválido')
            localStorage.clear()
          }
          
          setUser(null)
          setSession(null)
          setProfile(null)
        } else if (session?.user) {
          console.log('✅ Sesión encontrada, obteniendo perfil...')
          setSession(session)
          setUser(session.user)
          
          // Obtener perfil
          const profileData = await fetchProfile(session.user.id)
          if (mounted) {
            setProfile(profileData)
            console.log('✅ Perfil obtenido:', profileData?.role)
          }
        } else {
          console.log('ℹ️ No hay sesión activa')
          setUser(null)
          setSession(null)
          setProfile(null)
        }
        
        if (mounted) {
          setLoading(false)
          isInitialized.current = true
          clearTimeout(initTimeout)
          console.log('✅ Inicialización completa')
        }
      } catch (error) {
        console.error('❌ Error en initializeAuth:', error)
        clearTimeout(initTimeout)
        if (mounted) {
          setUser(null)
          setSession(null)
          setProfile(null)
          setLoading(false)
          isInitialized.current = true
        }
      }
    }

    // Ejecutar inicialización
    initializeAuth()

    // Configurar listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('🔔 Auth event:', event)
        
        // ✅ Ignorar TODOS los eventos hasta que termine la inicialización
        if (!isInitialized.current) {
          console.log('⏭️ Inicialización en progreso, ignorando evento:', event)
          return
        }
        
        // ✅ TOKEN_REFRESHED: Solo actualizar sesión silenciosamente
        if (event === 'TOKEN_REFRESHED') {
          const now = Date.now()
          const timeSinceLastRefresh = now - lastRefreshTime.current
          
          // Circuit breaker: Si hay más de 3 refreshes en menos de 5 segundos, hay un problema
          if (timeSinceLastRefresh < 5000) {
            tokenRefreshCount.current++
            
            if (tokenRefreshCount.current > 3) {
              console.error('🚨 LOOP DETECTADO: Demasiados TOKEN_REFRESHED. Limpiando sesión...')
              localStorage.clear()
              sessionStorage.clear()
              if (mounted) {
                setUser(null)
                setSession(null)
                setProfile(null)
              }
              // Forzar recarga de la página para resetear todo
              window.location.reload()
              return
            }
          } else {
            // Resetear contador si pasó suficiente tiempo
            tokenRefreshCount.current = 0
          }
          
          lastRefreshTime.current = now
          console.log('🔄 Token refrescado (contador:', tokenRefreshCount.current, ')')
          
          if (mounted && session) {
            setSession(session)
          }
          return
        }
        
        // ✅ SIGNED_IN: Usuario inició sesión
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ Usuario inició sesión, obteniendo perfil...')
          if (mounted) {
            setSession(session)
            setUser(session.user)
            
            const profileData = await fetchProfile(session.user.id)
            if (mounted) {
              setProfile(profileData)
              console.log('✅ Perfil cargado después de login')
            }
          }
          return
        }
        
        // ✅ SIGNED_OUT: Usuario cerró sesión
        if (event === 'SIGNED_OUT') {
          console.log('👋 Usuario cerró sesión')
          if (mounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
          }
          return
        }
        
        // ✅ USER_UPDATED: Perfil o datos actualizados
        if (event === 'USER_UPDATED' && session?.user) {
          console.log('🔄 Datos de usuario actualizados')
          if (mounted) {
            setSession(session)
            setUser(session.user)
          }
          return
        }
        
        // Cualquier otro evento
        console.log('ℹ️ Evento no manejado:', event)
      }
    )

    // Cleanup
    return () => {
      console.log('🧹 Limpiando AuthProvider')
      clearTimeout(initTimeout)
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Intentando iniciar sesión...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('❌ Error en signIn:', error)
        return { error }
      }
      
      console.log('✅ signIn exitoso')
      return { error: null }
    } catch (error) {
      console.error('❌ Excepción en signIn:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      console.log('👋 Cerrando sesión...')
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
      console.log('✅ Sesión cerrada')
    } catch (error) {
      console.error('❌ Error en signOut:', error)
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    signIn
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}