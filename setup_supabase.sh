#!/bin/bash

# 🚀 SCRIPT DE CONFIGURACIÓN DE SUPABASE
# Ejecuta este script para configurar el storage de avatares

echo "🚀 Configurando Supabase Storage para avatares..."

# 1. Hacer login en Supabase
echo "📝 Paso 1: Haciendo login en Supabase..."
npx supabase login

# 2. Vincular proyecto
echo "🔗 Paso 2: Vinculando proyecto..."
npx supabase link --project-ref epqalebkqmkddlfomnyf

# 3. Aplicar migraciones
echo "📦 Paso 3: Aplicando migraciones..."
npx supabase db push

# 4. Verificar configuración
echo "✅ Paso 4: Verificando configuración..."
npx supabase db diff

echo "🎉 ¡Configuración completada!"
echo "📋 Próximos pasos:"
echo "1. Ve a tu proyecto en Supabase Dashboard"
echo "2. Ve a Storage → Buckets"
echo "3. Verifica que existe el bucket 'avatars'"
echo "4. Prueba subir un avatar en la app"
