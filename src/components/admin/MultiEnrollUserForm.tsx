import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiEnrollUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Program {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
  program_id?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export function MultiEnrollUserForm({ open, onOpenChange, onSuccess }: MultiEnrollUserFormProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPrograms();
      fetchCourses(); 
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    updateFilteredCourses();
  }, [selectedPrograms, courses]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('id, title')
      .order('title');
    
    setPrograms(data || []);
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, program_id')
      .order('title');
    
    setCourses(data || []);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_with_emails');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProgramToggle = (programId: string) => {
    setSelectedPrograms(prev => 
      prev.includes(programId) 
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
    updateFilteredCourses();
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const updateFilteredCourses = () => {
    if (selectedPrograms.length === 0) {
      setFilteredCourses([]);
    } else {
      const filtered = courses.filter(course => 
        selectedPrograms.includes(course.program_id || '')
      );
      setFilteredCourses(filtered);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || (selectedPrograms.length === 0 && selectedCourses.length === 0)) {
      toast({
        title: "Error",
        description: "Debes seleccionar un usuario y al menos un programa o curso",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const enrollments = [];

      // Enroll in selected programs (avoid duplicates via onConflict)
      for (const programId of selectedPrograms) {
        enrollments.push({
          user_id: selectedUser.id,
          program_id: programId,
          status: 'active'
        });
      }

      // Enroll in selected courses by finding their programs
      for (const courseId of selectedCourses) {
        const course = courses.find(c => c.id === courseId);
        if (course?.program_id) {
          const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', selectedUser.id)
            .eq('program_id', course.program_id)
            .single();

          if (!existingEnrollment) {
            enrollments.push({
              user_id: selectedUser.id,
              program_id: course.program_id,
              status: 'active'
            });
          }
        }
      }

      if (enrollments.length > 0) {
        const { error } = await supabase
          .from('enrollments')
          .upsert(enrollments, { onConflict: 'user_id,program_id' });

        if (error) throw error;
      }

      // Inscribir automáticamente en todos los cursos de los programas seleccionados
      for (const programId of selectedPrograms) {
        // Obtener todos los cursos del programa
        const { data: programCourses, error: coursesError } = await supabase
          .from('program_courses')
          .select('course_id')
          .eq('program_id', programId);

        if (coursesError) {
          continue;
        }

        if (programCourses && programCourses.length > 0) {
          // Crear inscripciones en course_enrollments para cada curso del programa
          const courseEnrollments = programCourses.map(pc => ({
            user_id: selectedUser.id,
            course_id: pc.course_id,
            status: 'active' as const,
            progress_percent: 0
          }));

          const { error: courseEnrollmentError } = await supabase
            .from('course_enrollments')
            .upsert(courseEnrollments, { onConflict: 'user_id,course_id' });

        }
      }

      // Inscribir en cursos individuales seleccionados
      if (selectedCourses.length > 0) {
        const courseEnrollments = selectedCourses.map(courseId => ({
          user_id: selectedUser.id,
          course_id: courseId,
          status: 'active' as const,
          progress_percent: 0
        }));

        const { error: courseError } = await supabase
          .from('course_enrollments')
          .upsert(courseEnrollments, { onConflict: 'user_id,course_id' });

        if (courseError) {
          console.error('Error enrolling in individual courses:', courseError);
        }
      }

      toast({
        title: "Usuario inscrito",
        description: `${selectedUser.full_name} ha sido inscrito exitosamente`,
      });

      // Reset form
      setSelectedUser(null);
      setSelectedPrograms([]);
      setSelectedCourses([]);
      setSearchQuery('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
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
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Inscribir Usuario a Múltiples Programas</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Selection */}
            <div className="space-y-4">
              <Label>Buscar Usuario</Label>
              <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openUserSelect}
                    className="w-full justify-between"
                    disabled={loading}
                  >
                    {selectedUser
                      ? `${selectedUser.full_name} (${selectedUser.email})`
                      : "Buscar usuario por nombre o email..."
                    }
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Escribe para buscar..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {filteredUsers.slice(0, 10).map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.full_name} ${user.email}`}
                          onSelect={() => {
                            setSelectedUser(user);
                            setOpenUserSelect(false);
                          }}
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

            {/* Program Selection */}
            <div className="space-y-4">
              <Label>Seleccionar Programas</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">No hay programas disponibles</p>
                ) : (
                  programs.map(program => (
                    <Card key={program.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedPrograms.includes(program.id)}
                            onCheckedChange={() => handleProgramToggle(program.id)}
                          />
                          <span className="flex-1 text-sm font-medium">{program.title}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Course Selection - Always visible */}
            <div className="space-y-4">
              <Label>Seleccionar Cursos</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">No hay cursos disponibles</p>
                ) : (
                  courses.map(course => (
                    <Card key={course.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={() => handleCourseToggle(course.id)}
                          />
                          <span className="flex-1 text-sm font-medium">{course.title}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={loading} className="flex-1">
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