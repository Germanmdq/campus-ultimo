// 🎯 CÓDIGO FRONTEND PARA INSCRIPCIONES
// Usa la función RPC que creamos en RESCATE_INSCRIPCIONES.sql

import { supabase } from '@/integrations/supabase/client';

// 1️⃣ REGISTRO DE USUARIO (crea profile automáticamente)
export async function signUpUser(email: string, password: string, fullName: string, role: string = 'student') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (error) throw error;
    
    // El trigger automáticamente crea el profile
    console.log('✅ Usuario registrado y profile creado automáticamente');
    return data;
  } catch (error) {
    console.error('❌ Error en registro:', error);
    throw error;
  }
}

// 2️⃣ INSCRIPCIÓN A CURSO (usando RPC segura)
export async function enrollInCourse(courseId: string) {
  try {
    // Verificar que el usuario esté autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Llamar a la función RPC
    const { error } = await supabase.rpc('enroll_in_course', {
      p_course_id: courseId
    });

    if (error) throw error;
    
    console.log('✅ Usuario inscrito en curso exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error en inscripción:', error);
    throw error;
  }
}

// 3️⃣ VERIFICAR INSCRIPCIONES DEL USUARIO
export async function getUserEnrollments() {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        id,
        created_at,
        courses (
          id,
          title,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo inscripciones:', error);
    throw error;
  }
}

// 4️⃣ FUNCIÓN COMPLETA DE INSCRIPCIÓN (registro + inscripción)
export async function signUpAndEnroll(email: string, password: string, fullName: string, courseId: string, role: string = 'student') {
  try {
    // Paso 1: Registrar usuario
    const signUpData = await signUpUser(email, password, fullName, role);
    
    // Paso 2: Esperar un momento para que se cree el profile
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Paso 3: Inscribir en el curso
    await enrollInCourse(courseId);
    
    console.log('✅ Usuario registrado e inscrito exitosamente');
    return signUpData;
  } catch (error) {
    console.error('❌ Error en registro e inscripción:', error);
    throw error;
  }
}

// 5️⃣ EJEMPLO DE USO EN UN COMPONENTE
/*
// En tu componente de inscripción:
const handleEnroll = async () => {
  try {
    await enrollInCourse(courseId);
    toast.success('Inscripción exitosa');
  } catch (error) {
    toast.error('Error en la inscripción');
  }
};

// Para registro + inscripción:
const handleSignUpAndEnroll = async () => {
  try {
    await signUpAndEnroll(email, password, fullName, courseId);
    toast.success('Usuario registrado e inscrito exitosamente');
  } catch (error) {
    toast.error('Error en el proceso');
  }
};
*/
