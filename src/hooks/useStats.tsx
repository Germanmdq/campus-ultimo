import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalUsers: number;
  totalPrograms: number;
  totalCourses: number;
  totalEnrollments: number;
  activePrograms: number;
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPrograms: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    activePrograms: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener estadísticas en paralelo
      const [
        { count: usersCount },
        { count: programsCount },
        { count: coursesCount },
        { count: enrollmentsCount },
        { data: publishedPrograms }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('programs').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('programs').select('id').not('published_at', 'is', null)
      ]);

      setStats({
        totalUsers: usersCount || 0,
        totalPrograms: programsCount || 0,
        totalCourses: coursesCount || 0,
        totalEnrollments: enrollmentsCount || 0,
        activePrograms: publishedPrograms?.length || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchStats };
}