import { supabase } from '@/integrations/supabase/client';

export const createTestUsers = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('create-test-users', {
      body: {}
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creando usuarios de prueba:', error);
    throw error;
  }
};