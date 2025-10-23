# Configuración del Email Template del Magic Link en Supabase

El email del "Magic Link" que Supabase envía actualmente dice "Supabase" y usa plantillas predeterminadas. Para personalizarlo, sigue estos pasos:

## Paso 1: Acceder al Panel de Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto: **campus-ultimo** (o el nombre de tu proyecto)

## Paso 2: Configurar el Template del Magic Link

1. En el menú lateral izquierdo, ve a **Authentication** → **Email Templates**
2. Encontrarás varias plantillas. Busca **"Magic Link"**
3. Haz clic en **"Magic Link"** para editarla

## Paso 3: Personalizar el Contenido

Reemplaza el contenido del template con algo como esto:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="https://campus.espaciodegeometriasagrada.com/Logo-email.png" alt="Espacio de Geometría Sagrada" style="max-width: 200px; height: auto;">
            </td>
          </tr>

          <!-- Título -->
          <tr>
            <td align="center" style="padding: 0 40px 20px 40px;">
              <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">
                Accede a tu Campus
              </h1>
            </td>
          </tr>

          <!-- Mensaje -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Hola,
              </p>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Haz clic en el botón de abajo para acceder a tu cuenta del Campus de Geometría Sagrada. Este enlace es válido por 60 minutos.
              </p>
            </td>
          </tr>

          <!-- Botón CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display: inline-block; padding: 14px 40px; background-color: #8B5CF6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                Acceder al Campus
              </a>
            </td>
          </tr>

          <!-- Texto alternativo -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px; line-height: 1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; color: #8B5CF6; font-size: 14px; word-break: break-all;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Separador -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #eeeeee;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px; line-height: 1.6;">
                Si no solicitaste este enlace, puedes ignorar este correo de forma segura.
              </p>
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6;">
                Para cualquier consulta, escribe a <a href="mailto:info@espaciodegeometriasagrada.com" style="color: #8B5CF6; text-decoration: none;">info@espaciodegeometriasagrada.com</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer adicional -->
        <table width="600" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding: 20px 40px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © {{ .SiteURL }} - Espacio de Geometría Sagrada
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
```

### Variables disponibles en Supabase

- `{{ .ConfirmationURL }}` - El link mágico que el usuario debe hacer clic
- `{{ .Token }}` - El token de confirmación
- `{{ .TokenHash }}` - El hash del token
- `{{ .SiteURL }}` - La URL de tu sitio
- `{{ .Email }}` - El email del usuario (si quieres personalizarlo más)

## Paso 4: Configurar el Subject (Asunto del Email)

En la parte superior del template editor, también puedes personalizar el asunto:

```
Accede a tu Campus de Geometría Sagrada
```

O simplemente:

```
Tu enlace de acceso al Campus
```

## Paso 5: Guardar los Cambios

1. Haz clic en **"Save"** en la parte inferior del editor
2. Opcional: Envía un email de prueba con el botón **"Send test email"**

## Notas Importantes

- El logo debe estar disponible públicamente en: `https://campus.espaciodegeometriasagrada.com/Logo-email.png`
- El color `#8B5CF6` es el morado/violeta del tema (puedes cambiarlo si prefieres otro color)
- El enlace es válido por 60 minutos (esto se configura en Supabase → Authentication → Settings → Email Auth)

## Configuración Adicional (Opcional)

Si quieres cambiar el remitente del email (el "From"):

1. Ve a **Authentication** → **Settings**
2. Busca la sección **"SMTP Settings"**
3. Si deseas usar tu propio servidor SMTP (por ejemplo, Gmail, SendGrid, etc.), configúralo aquí
4. Esto te permite que los emails salgan desde `noreply@espaciodegeometriasagrada.com` en lugar de Supabase

---

## Resultado Final

Después de configurar esto, cuando un usuario haga clic en "Enviar Link Mágico", recibirá un email:

- ✅ Con tu logo de Geometría Sagrada
- ✅ Sin mencionar "Supabase"
- ✅ Con un botón claro para acceder
- ✅ Con tu branding y colores
- ✅ Con información de contacto correcta
