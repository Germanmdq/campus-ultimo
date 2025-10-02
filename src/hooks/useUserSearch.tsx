import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';

interface User {
  id: string;
  name: string;
  full_name: string;
  email: string;
  role: string;
  programs?: string[];
  courses?: string[];
}

interface UseUserSearchOptions {
  debounceMs?: number;
  minSearchLength?: number;
}

export function useUserSearch(options: UseUserSearchOptions = {}): {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  users: User[];
  loading: boolean;
  error: string | null;
  autocompleteOptions: Array<{ value: string; label: string; description: string }>;
  searchUsers: (term: string) => Promise<void>;
} {
  const { debounceMs = 300, minSearchLength = 2 } = options;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);
  
  // Autocomplete options for dropdown
  const autocompleteOptions = useMemo(() => {
    if (!searchTerm || searchTerm.length < minSearchLength) return [];
    
    return users.slice(0, 10).map(user => ({
      value: user.id,
      label: user.full_name,
      description: `${user.email} • ${user.role}`
    }));
  }, [users, searchTerm, minSearchLength]);
  
  // Search users with autocomplete
  const searchUsers = async (term: string) => {
    if (!term || term.length < minSearchLength) {
      setUsers([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('search', term);
      params.set('pageSize', '20'); // Limit for autocomplete
      params.set('all', 'true');
      
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      
      const json = await resp.json();
      
      if (json?.success && json?.data) {
        const userList = (json.data.users || []).map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email?.split('@')[0] || 'Sin nombre',
          full_name: u.full_name || u.email?.split('@')[0] || 'Sin nombre',
          email: u.email || '',
          role: u.role || 'student',
          programs: u.programs || [],
          courses: u.courses || [],
        }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Error en la búsqueda');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      searchUsers(debouncedSearchTerm);
    } else {
      setUsers([]);
    }
  }, [debouncedSearchTerm]);
  
  return {
    searchTerm,
    setSearchTerm,
    users,
    loading,
    error,
    autocompleteOptions,
    searchUsers
  };
}
