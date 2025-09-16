#!/bin/bash

# 🚀 CONFIGURACIÓN DE STORAGE VIA CURL
# Ejecuta: ./setup_storage_curl.sh

SUPABASE_URL="https://epqalebkqmkddlfomnyf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWFsZWJrcW1rZGRsZm9tbnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4MDAsImV4cCI6MjA1MDA1MDgwMH0.placeholder"

echo "🚀 Configurando storage de avatares via API..."

# 1. Verificar buckets existentes
echo "📋 Verificando buckets existentes..."
curl -X GET \
  "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "📝 Para configurar el storage completamente:"
echo "1. Ve a Supabase Dashboard → SQL Editor"
echo "2. Ejecuta el script setup_avatars_storage.sql"
echo "3. O usa el botón 'COPY SQL' en la app"
echo ""
echo "🎯 Alternativamente, ejecuta:"
echo "node setup_storage_api.js"
echo "(Necesitas configurar SUPABASE_SERVICE_ROLE_KEY)"
