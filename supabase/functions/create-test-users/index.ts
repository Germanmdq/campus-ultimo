import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Crear cliente admin de Supabase
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

    console.log('Creando usuarios de prueba...')

    // Crear usuarios de prueba
    const users = [
      { email: 'estudiante@test.com', password: 'test123', full_name: 'Ana García', role: 'student' },
      { email: 'profesor@test.com', password: 'test123', full_name: 'Carlos Mendoza', role: 'teacher' },
      { email: 'admin@test.com', password: 'test123', full_name: 'María Rodríguez', role: 'admin' }
    ]

    const createdUsers = []

    for (const user of users) {
      console.log(`Creando usuario: ${user.email}`)
      
      // Crear usuario con admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name
        }
      })

      if (authError) {
        console.error(`Error creando usuario ${user.email}:`, authError)
        continue
      }

      console.log(`Usuario ${user.email} creado con ID: ${authData.user?.id}`)

      // Actualizar el perfil con el rol correcto
      if (authData.user?.id) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ role: user.role, full_name: user.full_name })
          .eq('id', authData.user.id)

        if (profileError) {
          console.error(`Error actualizando perfil para ${user.email}:`, profileError)
        } else {
          console.log(`Perfil actualizado para ${user.email} con rol: ${user.role}`)
        }
      }

      createdUsers.push({
        email: user.email,
        id: authData.user?.id,
        role: user.role
      })
    }

    // Si se creó el estudiante, inscribirlo en el programa y crear progreso
    const student = createdUsers.find(u => u.role === 'student')
    if (student) {
      console.log('Creando data de ejemplo para el estudiante...')
      
      // Obtener programa
      const { data: program } = await supabaseAdmin
        .from('programs')
        .select('id')
        .eq('slug', 'geometria-sagrada-nivel-1')
        .single()

      if (program) {
        // Inscribir en el programa
        await supabaseAdmin
          .from('enrollments')
          .insert({
            user_id: student.id,
            program_id: program.id,
            status: 'active',
            progress_percent: 35
          })

        // Obtener lecciones
        const { data: lessons } = await supabaseAdmin
          .from('lessons')
          .select('id, slug')
          .in('slug', ['bienvenida-geometria-sagrada', 'numeros-y-formas'])

        if (lessons && lessons.length >= 2) {
          // Crear progreso
          await supabaseAdmin
            .from('lesson_progress')
            .insert([
              {
                user_id: student.id,
                lesson_id: lessons.find(l => l.slug === 'bienvenida-geometria-sagrada')?.id,
                watched_seconds: 1200,
                completed: true,
                approved: true
              },
              {
                user_id: student.id,
                lesson_id: lessons.find(l => l.slug === 'numeros-y-formas')?.id,
                watched_seconds: 800,
                completed: true,
                approved: false
              }
            ])

          // Crear entrega pendiente
          const lesson2 = lessons.find(l => l.slug === 'numeros-y-formas')
          if (lesson2) {
            await supabaseAdmin
              .from('assignments')
              .insert({
                user_id: student.id,
                lesson_id: lesson2.id,
                text_answer: 'He encontrado ejemplos de la proporción áurea en: 1) Los pétalos de una flor de girasol, 2) La concha de un nautilus, 3) Las hojas de una planta suculenta. En cada caso, se puede observar cómo la naturaleza utiliza esta proporción matemática para crear formas armoniosas y eficientes.',
                status: 'reviewing'
              })
          }
        }

        console.log('Data de ejemplo creada para el estudiante')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuarios de prueba creados exitosamente',
        users: createdUsers 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})