import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const ALLOWED_ORIGIN = "*"; 
// Si querés cerrarlo a tu dominio:
// const ALLOWED_ORIGIN = "https://campus.espaciodegeometriasagrada.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

serve(async (req: Request): Promise<Response> => {
  // 1) Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      headers: corsHeaders, 
      status: 405 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    console.log('🔍 Starting emergency name fix...');

    // 1. Check current profiles table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');

    console.log('📊 Table structure:', tableInfo);

    // 2. Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    console.log(`👥 Found ${profiles?.length || 0} profiles`);

    // 3. Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    console.log(`🔐 Found ${authUsers?.users?.length || 0} auth users`);

    const authUsersMap = new Map(authUsers?.users?.map(u => [u.id, u]) || []);

    // 4. Identify profiles with missing names
    const profilesNeedingNames = profiles?.filter(p => 
      !p.full_name || 
      p.full_name.trim() === '' || 
      p.full_name === 'Usuario' ||
      p.full_name === 'Sin nombre'
    ) || [];

    console.log(`❌ Profiles needing names: ${profilesNeedingNames.length}`);

    // 5. Fix names
    let fixed = 0;
    const fixes = [];

    for (const profile of profilesNeedingNames) {
      const authUser = authUsersMap.get(profile.id);
      if (!authUser) {
        console.log(`⚠️ No auth user found for profile ${profile.id}`);
        continue;
      }

      const meta = authUser.user_metadata || {};
      const email = authUser.email || '';
      
      // Try multiple sources for name
      let newName = meta.full_name || 
                   meta.name || 
                   meta.display_name ||
                   meta.first_name + ' ' + meta.last_name ||
                   (email ? email.split('@')[0] : 'Usuario');

      // Clean up the name
      newName = newName.trim();
      if (newName === '' || newName === 'Usuario' || newName === 'Sin nombre') {
        newName = email ? email.split('@')[0] : 'Usuario';
      }

      if (newName && newName !== profile.full_name) {
        fixes.push({
          id: profile.id,
          old_name: profile.full_name,
          new_name: newName,
          email: email
        });

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: newName })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`❌ Error updating profile ${profile.id}:`, updateError);
        } else {
          fixed++;
          console.log(`✅ Updated ${profile.id}: "${profile.full_name}" → "${newName}"`);
        }
      }
    }

    // 6. Verify the fix
    const { data: updatedProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('✅ Verification - Sample profiles after fix:', updatedProfiles);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emergency name fix completed! Updated ${fixed} profiles`,
        data: {
          totalProfiles: profiles?.length || 0,
          profilesNeedingNames: profilesNeedingNames.length,
          fixed,
          fixes: fixes.slice(0, 10), // Show first 10 fixes
          sampleAfterFix: updatedProfiles?.slice(0, 5)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('💥 Emergency fix error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error during emergency fix',
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
