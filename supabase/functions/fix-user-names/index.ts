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

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Get all profiles with null or empty full_name
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .or('full_name.is.null,full_name.eq.,full_name.eq.Usuario');

    if (profilesError) throw profilesError;

    console.log(`Found ${profiles?.length || 0} profiles with missing names`);

    // Get auth users for these profiles
    const userIds = profiles?.map(p => p.id) || [];
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No profiles need name updates',
          data: { updated: 0, total: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const authUsersMap = new Map(authUsers?.users?.map(u => [u.id, u]) || []);

    let updated = 0;
    const updates = [];

    for (const profile of profiles || []) {
      const authUser = authUsersMap.get(profile.id);
      if (!authUser) continue;

      // Try to get name from various sources
      const meta = authUser.user_metadata || {};
      const derivedName = meta.full_name || meta.name || meta.display_name || 
                          (authUser.email ? authUser.email.split('@')[0] : 'Usuario');

      if (derivedName && derivedName !== 'Usuario' && derivedName.trim()) {
        updates.push({
          id: profile.id,
          full_name: derivedName.trim()
        });
      }
    }

    // Update profiles in batch
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: update.full_name })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating profile ${update.id}:`, updateError);
        } else {
          updated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updated} user names`,
        data: {
          updated,
          total: profiles?.length || 0,
          updates: updates.map(u => ({ id: u.id, name: u.full_name }))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in fix-user-names function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error during name fix' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
