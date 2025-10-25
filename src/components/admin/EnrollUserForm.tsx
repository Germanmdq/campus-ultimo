import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrollUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Program {
  id: string;
  title: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export function EnrollUserForm({ open, onOpenChange, onSuccess }: EnrollUserFormProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // El usuario que se ha seleccionado
  const [programId, setProgramId] = useState(''); // El ID del programa seleccionado
  const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]); // Programas disponibles para el usuario seleccionado
  const [allUsers, setAllUsers] = useState<User[]>([]); // Lista maestra de todos los usuarios
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // Usuarios mostrados en el buscador
  const [searchQuery, setSearchQuery] = useState(''); // Término de búsqueda para usuarios
  const [loading, setLoading] = useState(false); // Estado para el envío del formulario
  const [dataLoading, setDataLoading] = useState(true); // Estado para la carga inicial de datos
  const [openUserSelect, setOpenUserSelect] = useState(false); // Controla si el popover de usuarios está abierto
  const { toast } = useToast();

  // Función para resetear el estado del formulario
  const resetFormState = () => {
    setSelectedUser(null);
    setProgramId('');
    setSearchQuery('');
    setAvailablePrograms([]);
    setFilteredUsers(allUsers);
  };

  useEffect(() => {
    if (open) {
      setDataLoading(true);
      Promise.all([fetchPrograms(), fetchAllUsers()]).finally(() => setDataLoading(false));
    } else {
      resetFormState(); // Limpia el estado cuando el diálogo se cierra
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered = allUsers.filter(user => 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(allUsers);
    }
  }, [searchQuery, allUsers]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, title')
        .not('published_at', 'is', null)
        .order('title');
      if (error) throw error;
      setAllPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los programas',
        variant: 'destructive',
      });
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_with_emails');
      if (error) throw error;
      const users = data || [];
      setAllUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    }
  };

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user);
    setProgramId('');
    setAvailablePrograms([]);
    setOpenUserSelect(false);
    setSearchQuery(''); // Limpiar búsqueda

    // Filtrar programas para este usuario específico
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('program_id')
      .eq('user_id', user.id);
    const enrolledProgramIds = new Set(enrollments?.map(e => e.program_id) || []);
    const available = allPrograms.filter(p => !enrolledProgramIds.has(p.id));
    setAvailablePrograms(available);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !programId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un usuario y programa",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: selectedUser.id,
          program_id: programId,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "✅ Usuario inscrito",
        description: `${selectedUser.full_name} inscrito exitosamente`,
      });

      resetFormState();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error enrolling user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo inscribir al usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inscribir Usuario a Programa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Buscar Usuario</Label>
              <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={loading || dataLoading}
                  >
                    {selectedUser
                      ? `${selectedUser.full_name} (${selectedUser.email})`
                      : "Buscar usuario..."
                    }
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Busca por nombre o email..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandEmpty>
                      {dataLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Cargando...
                        </div>
                      ) : (
                        "No se encontraron usuarios"
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredUsers.slice(0, 10).map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.full_name} ${user.email}`}
                          onSelect={() => handleUserSelect(user)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Programa</Label>
              <Select 
                value={programId} 
                onValueChange={setProgramId} 
                disabled={loading || dataLoading || !selectedUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedUser 
                      ? "Primero selecciona un usuario" 
                      : availablePrograms.length === 0
                      ? "No hay programas disponibles"
                      : "Seleccionar programa"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availablePrograms.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {!selectedUser 
                        ? "Selecciona un usuario primero"
                        : "Este usuario ya está inscrito en todos los programas"
                      }
                    </div>
                  ) : (
                    availablePrograms.map(program => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={loading || !selectedUser || !programId || availablePrograms.length === 0} 
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Inscribiendo...
                </>
              ) : (
                'Inscribir Usuario'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}