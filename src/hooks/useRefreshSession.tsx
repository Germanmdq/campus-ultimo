import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRefreshSession() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const refreshSession = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        throw error;
      }
      console.log('Session refreshed successfully');
      return data;
    } catch (error: any) {
      console.error('Failed to refresh session:', error);
      toast({
        title: "Error de sesión",
        description: "No se pudo renovar la sesión. Por favor, inicia sesión nuevamente.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  const checkAndRefreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return false;
      }

      if (!session) {
        console.log('No active session found');
        return false;
      }

      // Check if session is about to expire (within 5 minutes)
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeUntilExpiry < fiveMinutes) {
        console.log('Session expiring soon, refreshing...');
        await refreshSession();
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  };

  useEffect(() => {
    // Check session on mount
    checkAndRefreshSession();
  }, []);

  return {
    refreshSession,
    checkAndRefreshSession,
    isRefreshing
  };
}
