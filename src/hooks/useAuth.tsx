import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
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

  // Función para obtener el perfil del usuario
  const fetchProfile = async (userId: string) => {
    try {
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
    }
  }

  useEffect(() => {
    let mounted = true
    let subscription: any = null

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('Error obteniendo sesión:', error)
          
          // Limpiar localStorage si hay error de refresh token
          if (error.message?.includes('Refresh Token') || 
              error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('400') || 
              error.status === 400) {
            console.log('Limpiando localStorage debido a token inválido')
            localStorage.clear()
            setUser(null)
            setSession(null)
            setProfile(null)
          } else {
            setUser(null)
            setSession(null)
            setProfile(null)
          }
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          
          // Obtener perfil si hay usuario
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id)
            if (mounted) {
              setProfile(profileData)
            }
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error en initializeAuth:', error)
        if (mounted) {
          setUser(null)
          setSession(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    // Ejecutar inicialización
    initializeAuth()

    // Configurar listener de cambios de auth
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('Auth event:', event, session ? 'with session' : 'no session')
        
        // Ignorar evento inicial - ya fue manejado en initializeAuth
        if (event === 'INITIAL_SESSION') {
          return
        }
        
        // Solo actualizar sesión en TOKEN_REFRESHED, sin tocar perfil ni user
        if (event === 'TOKEN_REFRESHED') {
          if (mounted) {
            setSession(session)
          }
          return
        }
        
        // Para otros eventos importantes
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          // Obtener perfil solo en SIGNED_IN
          if (event === 'SIGNED_IN' && session?.user) {
            const profileData = await fetchProfile(session.user.id)
            if (mounted) {
              setProfile(profileData)
            }
          } else if (event === 'SIGNED_OUT') {
            setProfile(null)
          }
        }
      }
    )

    subscription = authSubscription

    // ✅ Cleanup dentro del useEffect
    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, []) // ✅ Array vacío - solo ejecutar una vez

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        return { error }
      }
      
      // El perfil se obtendrá automáticamente en el onAuthStateChange
      return { error: null }
    } catch (error) {
      console.error('Error en signIn:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
    } catch (error) {
      console.error('Error en signOut:', error)
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