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

    console.log('🔐 Starting emergency auth fix...');

    // 1. Check auth configuration
    const { data: authConfig, error: configError } = await supabase.auth.getSession();
    console.log('Auth config check:', { hasError: !!configError, error: configError?.message });

    // 2. Test storage with service role (bypassing RLS)
    console.log('🧪 Testing storage with service role...');
    
    const testContent = 'emergency auth test';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    const { data: testUpload, error: testError } = await supabase.storage
      .from('avatars')
      .upload('emergency-test.txt', testFile);

    if (testError) {
      console.error('❌ Service role upload failed:', testError);
    } else {
      console.log('✅ Service role upload successful:', testUpload);
      
      // Clean up test file
      await supabase.storage.from('avatars').remove(['emergency-test.txt']);
    }

    // 3. Create a test user to verify auth flow
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('👤 Creating test user...');
    const { data: testUser, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      user_metadata: {
        full_name: 'Test User',
        name: 'Test User'
      }
    });

    if (userError) {
      console.error('❌ Test user creation failed:', userError);
    } else {
      console.log('✅ Test user created:', testUser.user?.id);
      
      // Clean up test user
      if (testUser.user?.id) {
        await supabase.auth.admin.deleteUser(testUser.user.id);
        console.log('🧹 Test user cleaned up');
      }
    }

    // 4. Check JWT configuration
    const jwtSecret = Deno.env.get('JWT_SECRET');
    const jwtExpiry = Deno.env.get('JWT_EXPIRY');
    
    console.log('🔑 JWT Config:', {
      hasSecret: !!jwtSecret,
      hasExpiry: !!jwtExpiry,
      secretLength: jwtSecret?.length || 0
    });

    // 5. Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (dbError) {
      console.error('❌ Database connection failed:', dbError);
    } else {
      console.log('✅ Database connection successful');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Emergency auth diagnostics completed',
        data: {
          authConfigError: configError?.message || null,
          serviceRoleUpload: testError ? testError.message : 'success',
          testUserCreation: userError ? userError.message : 'success',
          jwtConfig: {
            hasSecret: !!jwtSecret,
            hasExpiry: !!jwtExpiry
          },
          databaseConnection: dbError ? dbError.message : 'success'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('💥 Emergency auth fix error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error during emergency auth fix',
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
