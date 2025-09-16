# 🚀 CONFIGURACIÓN DE STORAGE PARA AVATARES

## 📋 OPCIÓN 1: SQL Editor (Recomendado)

### Paso 1: Ir a Supabase Dashboard
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `epqalebkqmkddlfomnyf`
3. Ve a **SQL Editor**

### Paso 2: Ejecutar Script SQL
Copia y pega este script completo:

```sql
-- 🚀 CONFIGURACIÓN COMPLETA DE STORAGE PARA AVATARES
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear políticas RLS para avatars

-- Política de lectura pública (para mostrar avatares)
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

-- Política de subida para usuarios autenticados
CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Política de actualización para propietarios
CREATE POLICY "Users can update their own avatars" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);

-- Política de eliminación para propietarios
CREATE POLICY "Users can delete their own avatars" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  owner = auth.uid()
);

-- 3. Verificar que se creó correctamente
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- 4. Verificar políticas creadas
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';
```

### Paso 3: Verificar Configuración
1. Ve a **Storage → Buckets**
2. Deberías ver el bucket `avatars`
3. Debería estar marcado como **Público**

---

## 📋 OPCIÓN 2: Interfaz Web

### Paso 1: Crear Bucket
1. Ve a **Storage → Buckets**
2. Click **"New bucket"**
3. Configuración:
   - **Name**: `avatars`
   - **Public**: ✅ **Sí**
   - **File size limit**: `5 MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

### Paso 2: Configurar Políticas RLS
1. Ve a **Authentication → Policies**
2. Busca la tabla `storage.objects`
3. Crea estas políticas:

#### Política 1: Lectura Pública
- **Name**: `Public read access`
- **Operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition**: `bucket_id = 'avatars'`

#### Política 2: Subida Autenticada
- **Name**: `Authenticated users can upload`
- **Operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**: `bucket_id = 'avatars' AND auth.role() = 'authenticated'`

#### Política 3: Actualización Propia
- **Name**: `Users can update their own avatars`
- **Operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition**: `bucket_id = 'avatars' AND auth.role() = 'authenticated' AND owner = auth.uid()`

#### Política 4: Eliminación Propia
- **Name**: `Users can delete their own avatars`
- **Operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**: `bucket_id = 'avatars' AND auth.role() = 'authenticated' AND owner = auth.uid()`

---

## 📋 OPCIÓN 3: Desde la App

### Paso 1: Usar StorageDebug
1. Ve a la página **Cuenta** en la app
2. Busca el componente **StorageDebug**
3. Click **"📋 COPY SQL"**
4. Los comandos se copian al portapapeles

### Paso 2: Pegar en SQL Editor
1. Ve a Supabase Dashboard → SQL Editor
2. Pega los comandos copiados
3. Ejecuta el script

---

## ✅ VERIFICACIÓN

### Después de configurar:
1. **Verifica bucket**: Debería existir `avatars` en Storage → Buckets
2. **Verifica políticas**: Deberían existir 4 políticas para `storage.objects`
3. **Prueba upload**: Intenta subir un avatar en la app

### Si hay problemas:
1. **Revisa logs** en la consola del navegador
2. **Verifica permisos** en Supabase Dashboard
3. **Usa StorageDebug** para diagnosticar

---

## 🎯 RESULTADO ESPERADO

Después de la configuración:
- ✅ Bucket `avatars` existe y es público
- ✅ Políticas RLS configuradas correctamente
- ✅ Upload de avatares funciona en la app
- ✅ Avatares se muestran correctamente
- ✅ Usuarios pueden actualizar/eliminar sus propios avatares

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa la consola del navegador
2. Usa el componente StorageDebug en la app
3. Verifica la configuración en Supabase Dashboard
4. Ejecuta los scripts de verificación incluidos
