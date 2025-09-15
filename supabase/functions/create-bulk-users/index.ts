import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { users } = await req.json();
    console.log(`Procesando ${users.length} usuarios`);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const createdUsers = [];
    const errors = [];

    for (const user of users) {
      try {
        // Generate temporary password
        const tempPassword = `temp_${Math.random().toString(36).slice(-8)}`;
        
        // Mapear roles de LearnDash a nuestro sistema
        let role: 'admin' | 'teacher' | 'student' = 'student';
        const userRoles = Array.isArray(user.roles) ? user.roles : [];
        if (userRoles.includes('administrator')) role = 'admin';
        else if (userRoles.includes('group_leader') || userRoles.includes('instructor')) role = 'teacher';

        console.log(`Creando usuario: ${user.user_email} con rol: ${role}`);

        // Create user with admin privileges
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.user_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: user.display_name,
            imported_from_learndash: true,
            learndash_id: user.id
          }
        });

        if (authError) {
          console.error(`Error creando usuario ${user.user_email}:`, authError);
          errors.push({ email: user.user_email, error: authError.message });
          continue;
        }

        // Update profile with correct role
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ role, full_name: user.display_name })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error(`Error actualizando perfil ${user.user_email}:`, profileError);
          errors.push({ email: user.user_email, error: profileError.message });
          continue;
        }

        createdUsers.push({
          learndash_id: user.id,
          supabase_id: authData.user.id,
          email: user.user_email,
          role,
          temp_password: tempPassword
        });

      } catch (error) {
        console.error(`Error procesando usuario ${user.user_email}:`, error);
        errors.push({ email: user.user_email, error: error.message });
      }
    }

    console.log(`Usuarios creados: ${createdUsers.length}/${users.length}`);

    return new Response(JSON.stringify({ 
      success: true,
      created_users: createdUsers,
      errors: errors,
      total_processed: users.length,
      total_created: createdUsers.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en create-bulk-users:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});