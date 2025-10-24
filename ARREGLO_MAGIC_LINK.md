# ⚠️ ARREGLO URGENTE: Magic Link con URL incorrecta

## 🔴 Problema detectado:

El Magic Link que se envía tiene esta URL:
```
https://campus.espaciodegeometriasagrada.comt:3000/#access_token=...
```

**Errores**:
1. `.comt` → Debería ser `.com` (typo)
2. `:3000` → Puerto de desarrollo, NO debe estar en producción

## ✅ Solución (EN PANEL DE SUPABASE):

### Paso 1: Ir a Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**

### Paso 2: Configurar URLs correctamente

Cambia estos valores:

#### Site URL:
```
https://campus.espaciodegeometriasagrada.com
```
(SIN `:3000`, SIN typo en `.com`)

#### Redirect URLs (agrega esta línea):
```
https://campus.espaciodegeometriasagrada.com/**
```

**GUARDÁ LOS CAMBIOS** ← Muy importante

### Paso 3: Probar

1. Cierra sesión
2. Solicita un nuevo Magic Link
3. El email debe tener la URL: `https://campus.espaciodegeometriasagrada.com/#access_token=...`
4. El link DEBE funcionar ahora

---

## 📧 BONUS: Cambiar remitente (opcional)

Para que el email NO diga "Supabase":

### Opción A - Rápida:
1. Ve a **Authentication** → **Email Templates** → **Magic Link**
2. Cambia el template HTML (ver archivo `CONFIGURACION_EMAIL_SUPABASE.md`)

### Opción B - Completa (SMTP propio):
1. Ve a **Project Settings** → **Authentication** → **SMTP Settings**
2. Habilita **"Enable Custom SMTP"**
3. Configura tu servidor (Gmail, SendGrid, etc.)

**Ejemplo con Gmail**:
- Host: `smtp.gmail.com`
- Port: `587`
- Username: `tu-email@gmail.com`
- Password: App Password de Google
- Sender email: `noreply@espaciodegeometriasagrada.com`
- Sender name: `Campus Geometría Sagrada`

---

## ⚠️ NOTA IMPORTANTE:

**Este problema NO se arregla con código**, es configuración del panel de Supabase.

El código en `Auth.tsx` ya está correcto:
```typescript
emailRedirectTo: 'https://campus.espaciodegeometriasagrada.com/'
```

El problema está en **Site URL** en Supabase que tiene el typo y el `:3000`.
