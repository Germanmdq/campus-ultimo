import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email, password, fullName } = await req.json()

    console.log('Creating student user:', { email, fullName })

    // Create user in auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      throw authError
    }

    console.log('Auth user created:', authUser.user?.id)

    // Create profile as student
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user!.id,
        full_name: fullName,
        role: 'student'
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      throw profileError
    }

    console.log('Student profile created successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Student user created successfully',
        user_id: authUser.user!.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error creating student user:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})