import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');

    if (tableError) {
      throw tableError;
    }

    // Get sample profiles data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .limit(10);

    if (profilesError) {
      throw profilesError;
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Check for profiles with null or empty full_name
    const { data: nullNames, error: nullError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .or('full_name.is.null,full_name.eq.,full_name.eq.Usuario');

    if (nullError) {
      throw nullError;
    }

    // Check auth.users for comparison
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tableStructure: tableInfo,
          sampleProfiles: profiles,
          totalProfiles: totalCount,
          profilesWithNullNames: nullNames,
          authUsersCount: authUsers?.users?.length || 0,
          authUsersSample: authUsers?.users?.slice(0, 3).map(u => ({
            id: u.id,
            email: u.email,
            user_metadata: u.user_metadata,
            created_at: u.created_at
          })) || []
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        data: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
