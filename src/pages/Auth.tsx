import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  const { user, profile, loading: authLoading, signIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Set default theme to dark for auth page
    document.documentElement.classList.add('dark');
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect authenticated users based on their role
  if (user && profile) {
    switch (profile.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'teacher':
        return <Navigate to="/profesor" replace />;
      case 'student':
        return <Navigate to="/mi-formacion" replace />;
      default:
        return <Navigate to="/mi-formacion" replace />;
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      }
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Ingresa tu email para recibir el link mágico');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        setError('No se pudo enviar el link mágico. Verifica tu email.');
      } else {
        setMagicLinkSent(true);
        toast({
          title: "Link mágico enviado",
          description: "Revisa tu email y haz clic en el link para acceder",
        });
      }
    } catch (err) {
      setError('Ocurrió un error al enviar el link mágico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[calc(42rem-10px)]">
        <div className="text-center mb-8">
          <img src="/Logo-email.png" alt="Geometría Sagrada" className="h-20 w-auto object-contain mx-auto mb-4" />
          <p className="text-muted-foreground">
            Accede a tu cuenta para continuar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder a la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {magicLinkSent ? (
              <div className="text-center space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Se ha enviado un link mágico a tu email. Revisa tu bandeja de entrada y haz clic en el link para acceder.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline" 
                  onClick={() => setMagicLinkSent(false)}
                  className="w-full"
                >
                  Volver al login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Button type="submit" disabled={loading} className="w-full btn-modern">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleMagicLink}
                    disabled={loading}
                    className="w-full btn-modern"
                  >
                    Enviar Link Mágico
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-xs text-muted-foreground space-y-1">
          <div>¿Olvidaste tu contraseña? Haz click en enviar "Link Mágico"</div>
          <div>¿No tienes cuenta? Contacta a info@espaciodegeometriasagrada.com</div>
        </div>
      </div>
    </div>
  );
}