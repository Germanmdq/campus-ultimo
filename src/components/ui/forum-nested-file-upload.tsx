import { supabase } from '../../integrations/supabase/client';

export const uploadNestedFiles = async (files: File[], nestedReplyId: string) => {
  console.log('🔥 NUEVA uploadNestedFiles - INICIO');
  console.log('🔥 Files recibidos:', files.length);
  console.log('🔥 NestedReplyId recibido:', nestedReplyId);
  
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.error('❌ No hay archivos válidos');
    return [];
  }
  
  if (!nestedReplyId) {
    console.error('❌ No hay nestedReplyId válido');
    return [];
  }
  
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`🔥 Procesando archivo ${i + 1}/${files.length}: ${file.name}`);
    
    try {
      // 1. Subir archivo a Supabase Storage
      const fileName = `nested-replies/${nestedReplyId}/${Date.now()}-${file.name}`;
      console.log('🔥 Subiendo como:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('forum-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Error subiendo archivo:', uploadError);
        continue;
      }
      
      console.log('✅ Subido a storage:', uploadData);

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('forum-files')
        .getPublicUrl(fileName);
      
      console.log('🔥 URL pública:', publicUrl);

      // 3. CRÍTICO: Guardar en la tabla forum_nested_reply_files
      console.log('🔥 Guardando en BD con datos:', {
        nested_reply_id: nestedReplyId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      });

      const { data: dbData, error: dbError } = await supabase
        .from('forum_nested_reply_files')
        .insert({
          nested_reply_id: nestedReplyId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Error guardando en DB:', dbError);
        console.error('❌ Detalles del error:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        });
        
        // Eliminar archivo del storage si falla el guardado en DB
        await supabase.storage.from('forum-files').remove([fileName]);
        continue;
      }

      console.log('✅ Guardado en BD:', dbData);

      results.push({
        id: dbData.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      });

      console.log('✅ Archivo completado:', file.name);

    } catch (error) {
      console.error('❌ Error procesando archivo:', error);
    }
  }

  console.log('🔥 RESULTADO FINAL - Archivos procesados:', results.length);
  return results;
};
