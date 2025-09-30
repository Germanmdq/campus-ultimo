import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente admin con SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar que el usuario que llama sea admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el usuario sea admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener datos del request
    const { email, full_name, password, role } = await req.json()

    // Validaciones
    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email y nombre son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear usuario
    const createUserData: any = {
      email,
      email_confirm: true, // ✅ Auto-confirmar email
      user_metadata: {
        full_name,
        role
      },
      email_redirect_to: 'https://campus.espaciodegeometriasagrada.com/' // ✅ Dominio correcto
    }

    // Agregar password solo si se proporciona
    if (password) {
      createUserData.password = password
    }

    const { data: userData, error: userCreationError } = await supabaseAdmin.auth.admin.createUser(
      createUserData
    )

    if (userCreationError) {
      throw userCreationError
    }

    // Crear perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user.id,
        full_name,
        role
      })

    if (profileError) {
      // Si falla la creación del perfil, eliminar el usuario
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw profileError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData.user 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})