import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  full_name: string;
  email?: string;
  role: 'student' | 'formador' | 'voluntario' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Función para mapear roles
  const mapRole = (r: string) => {
    if (r === 'teacher' || r === 'profesor') return 'formador' as const;
    if (r === 'administrador') return 'admin' as const;
    if (r === 'estudiante') return 'student' as const;
    if (r === 'voluntariuo') return 'voluntario' as const; // corregir typo
    return r as any;
  };

  // Función para obtener perfil
  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (profile) {
        return {
          ...profile,
          email: userEmail,
          role: mapRole(profile.role)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error en fetch profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Manejar eventos específicos
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          // Limpiar localStorage
          localStorage.clear();
          sessionStorage.clear();
          // Redirigir al login si no estamos ya ahí
          if (!window.location.pathname.includes('/login')) {
            navigate('/login');
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refrescado exitosamente');
        }
        
        if (session?.user) {
          // Fetch profile data
          const profile = await fetchProfile(session.user.id, session.user.email);
          setProfile(profile);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const profile = await fetchProfile(session.user.id, session.user.email);
          setProfile(profile);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Error inesperado al iniciar sesión' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error?: string }> => {
    try {
      // Usar el dominio de producción en lugar de localhost
      const redirectUrl = 'https://campus.espaciodegeometriasagrada.com/';
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Error inesperado al crear cuenta' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Limpiar estado local
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Limpiar localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      navigate('/');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      toast({
        title: "Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}