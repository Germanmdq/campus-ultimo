import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!url || !service) {
      console.error('Missing environment variables:', { url: !!url, service: !!service });
      return new Response(JSON.stringify({ error: "Missing service environment variables" }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(url, service);

    // Parse body with better error handling
    let body: any = {};
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { email, password, full_name, role } = body ?? {};
    
    // Validate required fields
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required and must be a string" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!full_name || typeof full_name !== "string") {
      return new Response(JSON.stringify({ error: "full_name is required and must be a string" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Creating user with:', { email, full_name, role });

    // 1) Create user (admin)
    const createUserData: any = {
      email,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: role || 'student'
      },
      email_redirect_to: 'https://campus.espaciodegeometriasagrada.com/'
    };

    // Add password if provided
    if (password && typeof password === "string") {
      createUserData.password = password;
    }

    const { data: userData, error: userCreationError } = await supabase.auth.admin.createUser(createUserData);

    if (userCreationError) {
      console.error('User creation error:', userCreationError);
      return new Response(JSON.stringify({ 
        error: "Failed to create user", 
        details: userCreationError.message 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verify user was created
    if (!userData || !userData.user) {
      console.error('No user data returned');
      return new Response(JSON.stringify({ error: "No user data returned from creation" }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = userData.user.id;
    console.log('User created successfully:', userId);

    // 2) Create profile (bypass RLS with service role)
    const profileData = {
      id: userId,
      email,
      full_name,
      role: role || 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .insert(profileData);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // If profile already exists (unique violation), that's okay
      if (profileError.code === "23505") {
        console.log('Profile already exists, continuing...');
      } else {
        // If it's a different error, clean up the user
        await supabase.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ 
          error: "Failed to create profile", 
          details: profileError.message 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    } else {
      console.log('Profile created successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: userData.user,
      message: "User and profile created successfully"
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});