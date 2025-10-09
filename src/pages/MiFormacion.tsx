import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type CourseCard = {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  poster_2x3_url?: string | null;
  wide_11x6_url?: string | null;
  published_at?: string | null;
};

export default function MiFormacion() {
  const { profile } = useAuth();
  const [myCourses, setMyCourses] = useState<CourseCard[]>([]);
  const [myPrograms, setMyPrograms] = useState<any[]>([]);

  useEffect(() => {
    const fetchMyCourses = async () => {
      if (!profile?.id) {
        setMyCourses([]);
        return;
      }

      // Programas inscritos
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          program_id,
          programs (
            id,
            title,
            summary,
            slug,
            poster_2x3_url,
            wide_11x6_url,
            published_at
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active');

      const enrolledPrograms = (enrollmentsData || [])
        .map(row => row.programs)
        .filter(Boolean);
      
      setMyPrograms(enrolledPrograms);

      const programIds = (enrollmentsData || []).map(p => p.program_id);

      let programCourses: any[] = [];
      if (programIds.length > 0) {
        const { data: pc } = await supabase
          .from('program_courses')
          .select('courses (id, title, summary, slug, poster_2x3_url, wide_11x6_url, published_at)')
          .in('program_id', programIds)
          .order('program_id');
        programCourses = pc || [];
      }

      const coursesFromPrograms = programCourses
        .map(row => row.courses)
        .filter(Boolean);

      // Cursos individuales inscritos
      const { data: ce, error: ceError } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          status,
          courses (
            id,
            title,
            summary,
            slug,
            poster_2x3_url,
            wide_11x6_url,
            published_at
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (ceError) {
        console.error('Error obteniendo course_enrollments:', ceError);
      }

      const individualCourses = (ce || [])
        .map(row => row.courses)
        .filter(Boolean);

      // Combinar TODOS los cursos: de programas + individuales
      const allCourses = [...coursesFromPrograms, ...individualCourses];

      setMyCourses(allCourses);
    };

    fetchMyCourses();
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mi Formación</h1>
        <p className="text-muted-foreground">Tus programas y cursos individuales</p>
      </div>

      {/* Grilla unificada 3 por fila: primero programas, luego cursos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {myPrograms.map((program) => (
          <Card key={`program-${program.id}`} className="cursor-pointer hover:elev-3 hover:-translate-y-1 transition-all duration-300 glow-hover">
            <Link to={`/programas/${program.slug}`}>
              <div className="aspect-[2/3] bg-gradient-to-br from-accent/20 to-accent/10 rounded-t-lg flex items-center justify-center">
                {program.poster_2x3_url ? (
                  <img 
                    src={program.poster_2x3_url} 
                    alt={program.title}
                    className="w-full h-full object-cover rounded-t-lg"
                    loading="lazy"
                  />
                ) : (
                  <BookOpen className="h-12 w-12 text-accent" />
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-2">{program.title}</h3>
              </CardContent>
            </Link>
          </Card>
        ))}

        {myCourses.map((course) => (
          <Card key={`course-${course.id}`} className="cursor-pointer hover:elev-3 hover:-translate-y-1 transition-all duration-300 glow-hover">
            <Link to={`/ver-curso/${course.slug}`}>
              <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                {course.poster_2x3_url || course.wide_11x6_url ? (
                  <img 
                    src={course.poster_2x3_url || course.wide_11x6_url} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-accent" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
