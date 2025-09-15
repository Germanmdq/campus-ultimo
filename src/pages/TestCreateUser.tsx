import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createStudentUser } from '@/hooks/useCreateStudentUser';

export default function TestCreateUser() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateMarcelo = async () => {
    setLoading(true);
    try {
      const result = await createStudentUser('plataformager@gmail.com', 'mdygg2011', 'Marcelo');
      
      if (result.success) {
        toast({
          title: "¡Usuario Marcelo creado!",
          description: "El estudiante Marcelo ha sido creado exitosamente.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo crear el usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al crear el usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-6 p-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Crear Usuario Marcelo</h1>
          <p className="text-muted-foreground mt-2">
            Email: plataformager@gmail.com<br />
            Password: mdygg2011
          </p>
        </div>
        <Button 
          onClick={handleCreateMarcelo} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Creando usuario...' : 'Crear Usuario Marcelo'}
        </Button>
      </div>
    </div>
  );
}