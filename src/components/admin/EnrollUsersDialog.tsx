import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface EnrollUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programTitle: string;
  onSuccess: () => void;
}

export function EnrollUsersDialog({ 
  open, 
  onOpenChange, 
  programId, 
  programTitle,
  onSuccess 
}: EnrollUsersDialogProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open, programId]);

  const fetchAvailableUsers = async () => {
    try {
      // Get users that are NOT already enrolled in this program
      const { data: existingEnrollments } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('program_id', programId);

      const enrolledUserIds = existingEnrollments?.map(e => e.user_id) || [];

      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .not('id', 'in', `(${enrolledUserIds.join(',') || 'NULL'})`)
        .order('full_name');

      if (error) throw error;
      setUsers(allUsers || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios disponibles",
        variant: "destructive",
      });
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleEnrollUsers = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un usuario",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Upsert new enrollments to avoid duplicates (unique key user_id,program_id)
      const enrollments = selectedUsers.map(userId => ({
        user_id: userId,
        program_id: programId,
        status: 'active' as const,
        progress_percent: 0
      }));

      const { error } = await supabase
        .from('enrollments')
        .upsert(enrollments);

      if (error) throw error;

      toast({
        title: "Usuarios inscritos",
        description: `Se inscribieron ${selectedUsers.length} usuario(s) al programa "${programTitle}"`,
      });

      setSelectedUsers([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron inscribir los usuarios al programa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'formador': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'voluntario': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'formador': return 'Formador';
      case 'voluntario': return 'Voluntario';
      case 'admin': return 'Admin';
      default: return 'Estudiante';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Inscribir Usuarios - {programTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          <div>
            <Label>Buscar usuarios</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay usuarios disponibles para inscribir</p>
                <p className="text-sm mt-2">
                  {searchTerm ? 'Prueba con otros términos de búsqueda' : 'Todos los usuarios ya están inscritos en este programa'}
                </p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <Card key={user.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{user.full_name}</h4>
                        <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={handleEnrollUsers} 
            disabled={loading || selectedUsers.length === 0}
            className="flex-1"
          >
            {loading ? 'Inscribiendo...' : `Inscribir ${selectedUsers.length} usuario(s)`}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}