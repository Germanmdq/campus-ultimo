import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  full_name: z.string().min(1, { message: 'El nombre es requerido' }),
  role: z.enum(['student', 'formador', 'voluntario', 'admin']),
  email: z.string().email({ message: 'Email inválido' }),
});

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'formador' | 'voluntario' | 'admin';
  status: string;
  enrolledPrograms: number;
  joinedAt: string;
  lastSignInAt: string | null;
  programs: string[];
  courses: string[];
}

interface EditUserProfileDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUserProfileDialog({ user, open, onOpenChange, onSuccess }: EditUserProfileDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      role: 'student',
      email: '',
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        full_name: user.full_name || '',
        role: user.role,
        email: user.email || '',
      });
    } else if (!open) {
      form.reset();
    }
  }, [user, open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          role: values.role,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update auth user email if it changed
      if (values.email !== user.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
          email: values.email,
        });

        if (authError) {
          console.warn('Could not update auth email:', authError);
          // Don't throw here, profile was updated successfully
        }
      }

      toast({
        title: 'Perfil actualizado',
        description: 'El perfil del usuario ha sido actualizado exitosamente.',
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el perfil del usuario.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil de Usuario</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo del usuario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Estudiante</SelectItem>
                      <SelectItem value="formador">Formador</SelectItem>
                      <SelectItem value="voluntario">Voluntario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
