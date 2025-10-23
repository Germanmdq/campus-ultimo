type SendEmailPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

const EDGE_EMAIL_URL = 'https://epqalebkqmkddlfomnyf.functions.supabase.co/email-dispatcher';

export async function sendEmail(payload: SendEmailPayload): Promise<{ success: boolean }> {
  const res = await fetch(EDGE_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data?.error || 'send_error');
    } catch {
      throw new Error('send_error');
    }
  }
  return { success: true };
}

function baseHtmlTemplate({ title, body, ctaLabel, ctaUrl, logoUrl }: { title: string; body: string; ctaLabel?: string; ctaUrl?: string; logoUrl?: string }) {
  // Mantener estilos simples y neutros, respetando la identidad existente
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#0b0b0b; color:#e5e5e5; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#111213;border:1px solid #232323;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #232323;display:flex;align-items:center;gap:12px;">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:28px;width:28px;border-radius:8px;object-fit:cover;" />` : ''}
        <h1 style="margin:0;font-size:18px;">${title}</h1>
      </div>
      <div style="padding:24px;line-height:1.6;">
        ${body}
        ${ctaLabel && ctaUrl ? `
        <div style="margin-top:20px;">
          <a href="${ctaUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#1f2937;color:white;text-decoration:none;">${ctaLabel}</a>
        </div>` : ''}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #232323;font-size:12px;color:#9ca3af;">
        Enviado por el Campus · No responder a este correo.
      </div>
    </div>
  </div>`;
}

export async function sendModuleCompletedEmail(params: { to: string; modulo: string; proximo?: string; ctaUrl?: string }) {
  const subject = `Felicitaciones, completaste el modulo ${params.modulo}`;
  const body = `
    <p>¡Gran trabajo! 🎉</p>
    <p>Lo que sigue: ${params.proximo || 'Continuá con el siguiente módulo cuando quieras.'}</p>
  `;
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/Logo-email.png` : undefined;
  const html = baseHtmlTemplate({ title: subject, body, ctaLabel: 'Ver siguiente módulo', ctaUrl: params.ctaUrl, logoUrl });
  return sendEmail({ to: params.to, subject, html });
}

export async function sendCourseCompletedEmail(params: { to: string; nombre?: string; curso: string; ctaUrl?: string }) {
  const subject = `Increíble, ${params.nombre || ''}. Finalizaste el curso ${params.curso}`.trim();
  const body = `
    <p>¡Felicitaciones por completar el curso!</p>
    <p>Descarga tu certificado personalizado.</p>
  `;
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/Logo-email.png` : undefined;
  const html = baseHtmlTemplate({ title: subject, body, ctaLabel: 'Descargar certificado', ctaUrl: params.ctaUrl, logoUrl });
  return sendEmail({ to: params.to, subject, html });
}

export async function sendWeeklySummaryEmail(params: { to: string; progreso: number; interacciones: number; eventos: string; ctaUrl?: string }) {
  const subject = `Tu semana: ${params.progreso}% de avance`;
  const body = `
    <p><strong>Resumen</strong></p>
    <ul>
      <li>Interacciones: ${params.interacciones}</li>
      <li>Próximas clases: ${params.eventos}</li>
    </ul>
  `;
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/Logo-email.png` : undefined;
  const html = baseHtmlTemplate({ title: subject, body, ctaLabel: 'Ir a mis cursos', ctaUrl: params.ctaUrl, logoUrl });
  return sendEmail({ to: params.to, subject, html });
}

export async function sendPostCourseRecommendationEmail(params: { to: string; curso: string; siguiente_programa: string; ctaUrl?: string }) {
  const subject = `Ya completaste ${params.curso}`;
  const body = `
    <p>Te recomendamos continuar con <strong>${params.siguiente_programa}</strong>.</p>
  `;
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/Logo-email.png` : undefined;
  const html = baseHtmlTemplate({ title: subject, body, ctaLabel: 'Ver siguiente programa', ctaUrl: params.ctaUrl, logoUrl });
  return sendEmail({ to: params.to, subject, html });
}

export async function sendInactivityEmail(params: { to: string; days: number; ctaUrl?: string }) {
  const subject = `Te extrañamos · Hace ${params.days} días sin actividad`;
  const body = `
    <p>Retomá tu formación cuando quieras. Estamos para ayudarte.</p>
  `;
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/Logo-email.png` : undefined;
  const html = baseHtmlTemplate({ title: subject, body, ctaLabel: 'Volver al Campus', ctaUrl: params.ctaUrl, logoUrl });
  return sendEmail({ to: params.to, subject, html });
}

export async function sendSupportEmail(params: { from: string; message: string }) {
  const subject = `Consulta de soporte desde el Campus`;
  const body = `
    <p><strong>Email del usuario:</strong> ${params.from}</p>
    <p><strong>Mensaje:</strong></p>
    <p style="white-space: pre-wrap;">${params.message}</p>
  `;
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/Logo-email.png` : undefined;
  const html = baseHtmlTemplate({ title: subject, body, logoUrl });
  return sendEmail({ to: 'soporte@espaciodegeometriasagrada.com', subject, html });
}
