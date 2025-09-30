## Espacio de Geometría Sagrada · Campus

Aplicación web del campus (React + Vite + TypeScript + Tailwind + shadcn-ui) con backend de datos y funciones en Supabase.

### Requisitos
- Node.js 18+ y npm
- Cuenta de Supabase (URL y Anon Key)

### Configuración local
1) Instalar dependencias:
```bash
npm install
```
2) Variables de entorno (frontend) – crea un archivo `.env` en la raíz:
```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```
3) Ejecutar en desarrollo:
```bash
npm run dev
```
Se abre en `http://localhost:8080`.

### Scripts
- `npm run dev`: servidor de desarrollo
- `npm run build`: compilar a producción (carpeta `dist/`)
- `npm run preview`: servir `dist/` para prueba local

### Integración con Supabase
- Cliente: `src/integrations/supabase/client.ts`
- Tipos: `src/integrations/supabase/types.ts`
- Funciones Edge (Deno): carpeta `supabase/functions/*`

Secrets requeridos en Supabase (para funciones de emails y administración):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GETRESPONSE_API_KEY`
- `GETRESPONSE_FROM_EMAIL`, `GETRESPONSE_FROM_NAME`, `GETRESPONSE_REPLY_TO`

Despliegue de funciones (con Supabase CLI):
```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions deploy email-dispatcher list-users activity weekly-summary inactivity-notify slack-proxy
```

### Despliegue en Vercel
1) Conecta el repositorio.
2) Build Command: `npm run build`
3) Output Directory: `dist`
4) Variables de entorno (Project Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

`vercel.json` ya incluye el fallback de SPA a `index.html`.

### Accesos y roles
- Autenticación: Supabase Auth.
- Roles de perfil: `student`, `formador`, `voluntario`, `admin`.
- La página `/admin` está protegida: solo `admin` y `formador`.

### Emails
- Envíos transaccionales vía función `email-dispatcher` (GetResponse).
- Tareas programables: `weekly-summary`, `inactivity-notify` (Scheduled Functions).

### Móvil
La UI es responsive (sidebar como drawer en móvil). Probar en la red local con la URL que muestra Vite (por ejemplo `http://192.168.x.x:8080`).

### Buenas prácticas
- No subir `.env`, `node_modules/` ni `dist/` (definido en `.gitignore`).
- Rotar claves si se publicaron por error.

### Licencia
Proyecto privado del Espacio de Geometría Sagrada.
# Trigger deploy
