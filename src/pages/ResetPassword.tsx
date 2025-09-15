import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Ingresa un email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { email, newPassword: 'mdygg2011' }
      });

      if (error) throw error;

      toast({
        title: "¡Contraseña actualizada!",
        description: `La contraseña de ${email} se cambió a "mdygg2011"`,
      });
      setEmail('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo resetear la contraseña",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Resetear Contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email del usuario</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
            />
          </div>
          <Button 
            onClick={handleReset} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Reseteando...' : 'Resetear a "mdygg2011"'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Emails disponibles: plataformager@gmail.com, germangonzalezmdq@gmail.com, etc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}