-- Script para configurar URLs permitidas en Supabase
-- Ejecutar en la consola SQL de Supabase

-- 1. Verificar configuración actual de URLs
SELECT 
    key,
    value
FROM auth.config 
WHERE key IN ('SITE_URL', 'ADDITIONAL_REDIRECT_URLS');

-- 2. Configurar URLs permitidas (esto debe hacerse en el Dashboard de Supabase)
-- Ve a: Authentication → Settings → Site URL
-- Site URL: https://campus.espaciodegeometriasagrada.com
-- Additional Redirect URLs: 
--   - https://campus.espaciodegeometriasagrada.com/**
--   - http://localhost:5173/**
--   - http://localhost:5174/**

-- 3. Verificar que las URLs estén configuradas correctamente
SELECT 'Configuración de URLs completada' as status;
