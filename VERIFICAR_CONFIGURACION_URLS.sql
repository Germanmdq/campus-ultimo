-- Script para verificar y configurar URLs de Supabase para links mágicos
-- Ejecutar en la consola SQL de Supabase Dashboard

-- 1. Verificar configuración actual de URLs
SELECT 
    key,
    value,
    'Configuración actual' as status
FROM auth.config 
WHERE key IN ('SITE_URL', 'ADDITIONAL_REDIRECT_URLS')
ORDER BY key;

-- 2. Verificar que las URLs estén configuradas correctamente
-- IMPORTANTE: Estas configuraciones deben hacerse en el Dashboard de Supabase
-- NO se pueden cambiar directamente con SQL por seguridad

-- Ve a: Authentication → Settings → Site URL
-- Site URL debe ser: https://campus.espaciodegeometriasagrada.com

-- Ve a: Authentication → Settings → Additional Redirect URLs
-- Agregar estas URLs (una por línea):
-- https://campus.espaciodegeometriasagrada.com/**
-- http://localhost:5173/**
-- http://localhost:3000/**

-- 3. Verificar configuración después de cambios en Dashboard
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.config 
            WHERE key = 'SITE_URL' 
            AND value = 'https://campus.espaciodegeometriasagrada.com'
        ) THEN '✅ Site URL configurada correctamente'
        ELSE '❌ Site URL necesita configuración'
    END as site_url_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.config 
            WHERE key = 'ADDITIONAL_REDIRECT_URLS' 
            AND value LIKE '%campus.espaciodegeometriasagrada.com%'
        ) THEN '✅ Redirect URLs incluyen producción'
        ELSE '❌ Redirect URLs necesitan configuración'
    END as redirect_urls_status;

-- 4. Información adicional
SELECT 
    'CONFIGURACIÓN REQUERIDA:' as titulo,
    '1. Site URL: https://campus.espaciodegeometriasagrada.com' as paso_1,
    '2. Additional Redirect URLs: https://campus.espaciodegeometriasagrada.com/**' as paso_2,
    '3. Additional Redirect URLs: http://localhost:5173/**' as paso_3,
    '4. Additional Redirect URLs: http://localhost:3000/**' as paso_4;
