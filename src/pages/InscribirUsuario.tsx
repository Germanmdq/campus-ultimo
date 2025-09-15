import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function InscribirUsuario() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'formador' | 'voluntario' | 'admin'>('student');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, title')
        .order('title');
      
      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, program_id')
        .order('title');
      
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase.rpc('get_users_with_emails');
      if (usersError) throw usersError;
      setUsers(usersData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const handleProgramToggle = (programId: string) => {
    setSelectedPrograms(prev => 
      prev.includes(programId) 
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
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

      // Enroll in selected programs
      for (const programId of selectedPrograms) {
        const { data: existingEnrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', selectedUser)
          .eq('program_id', programId)
          .maybeSingle();

        if (!existingEnrollment) {
          enrollments.push({
            user_id: selectedUser,
            program_id: programId,
            status: 'active'
          });
        }
      }

      // Enroll in selected courses by finding their programs
      for (const courseId of selectedCourses) {
        const course = courses.find(c => c.id === courseId);
        if (course?.program_id) {
          const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', selectedUser)
            .eq('program_id', course.program_id)
            .maybeSingle();

          if (!existingEnrollment) {
            enrollments.push({
              user_id: selectedUser,
              program_id: course.program_id,
              status: 'active'
            });
          }
        }
      }

      // Remove duplicates from enrollments array
      const uniqueEnrollments = enrollments.filter((enrollment, index, self) => 
        index === self.findIndex(e => e.user_id === enrollment.user_id && e.program_id === enrollment.program_id)
      );

      if (uniqueEnrollments.length > 0) {
        const { error } = await supabase
          .from('enrollments')
          .upsert(uniqueEnrollments, { 
            onConflict: 'user_id,program_id',
            ignoreDuplicates: true 
          });

        if (error) throw error;
      }

      const selectedUserData = users.find(u => u.id === selectedUser);
      toast({
        title: "Usuario inscrito",
        description: `${selectedUserData?.full_name} ha sido inscrito exitosamente`,
      });

      // Reset form
      setSelectedUser('');
      setSelectedPrograms([]);
      setSelectedCourses([]);
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
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Inscribir Usuario</h1>
          <Button variant="outline" onClick={() => navigate('/usuarios')}>
            Volver
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Crear usuario nuevo */}
          <Card>
            <CardHeader>
              <CardTitle>Crear usuario nuevo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@dominio.com" />
              </div>
              <div>
                <Label>Nombre completo</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre y apellido" />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Contraseña temporal" />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Estudiante</SelectItem>
                    <SelectItem value="formador">Formador</SelectItem>
                    <SelectItem value="voluntario">Voluntario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  onClick={async () => {
                    if (!newEmail || !newName || !newPassword) {
                      toast({ title: 'Completa email, nombre y contraseña', variant: 'destructive' });
                      return;
                    }
                    try {
                      const res = await fetch('https://epqalebkqmkddlfomnyf.functions.supabase.co/create-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: newEmail, password: newPassword, full_name: newName, role: newRole })
                      });
                      const data = await res.json();
                      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo crear el usuario');
                      // refrescar lista de usuarios y seleccionar el nuevo
                      const { data: usersData } = await supabase.rpc('get_users_with_emails');
                      setUsers(usersData || []);
                      const created = (usersData || []).find((u: any) => u.email === newEmail);
                      if (created) setSelectedUser(created.id);
                      toast({ title: 'Usuario creado', description: newEmail });
                      setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('student');
                    } catch (e: any) {
                      toast({ title: 'Error', description: e?.message || 'No se pudo crear', variant: 'destructive' });
                    }
                  }}
                >Crear y seleccionar</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Programas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {programs.length === 0 ? (
                  <p className="text-muted-foreground">No hay programas disponibles</p>
                ) : (
                  programs.map(program => (
                    <div key={program.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`program-${program.id}`}
                        checked={selectedPrograms.includes(program.id)}
                        onCheckedChange={() => handleProgramToggle(program.id)}
                      />
                      <Label htmlFor={`program-${program.id}`} className="flex-1">
                        {program.title}
                      </Label>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cursos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {courses.length === 0 ? (
                  <p className="text-muted-foreground">No hay cursos disponibles</p>
                ) : (
                  courses.map(course => (
                    <div key={course.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`course-${course.id}`}
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => handleCourseToggle(course.id)}
                      />
                      <Label htmlFor={`course-${course.id}`} className="flex-1">
                        {course.title}
                      </Label>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
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
              onClick={() => navigate('/usuarios')}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}