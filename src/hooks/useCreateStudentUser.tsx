import { supabase } from '@/integrations/supabase/client';

export const createStudentUser = async (email: string, password: string, fullName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-student-user', {
      body: { email, password, fullName }
    });

    if (error) {
      console.error('Error creating student user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating student user:', error);
    return { success: false, error: error.message };
  }
};