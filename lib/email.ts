export type EmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

function getAppHostname(): string {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://emitia.com.ar';
  try {
    return new URL(appUrl).hostname;
  } catch {
    return 'emitia.com.ar';
  }
}

export async function sendSystemEmail(options: {
  to: string;
  subject: string;
  html: string;
  senderAlias?: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; message?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'RESEND_API_KEY no configurada' };
  }

  const hostname = getAppHostname();
  const fromName = options.senderAlias || 'EMITIA';
  const from = process.env.EMAIL_FROM || `${fromName} <noreply@${hostname}>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((file) => ({
        filename: file.filename,
        content: file.content,
        content_type: file.contentType || 'application/octet-stream',
      })),
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      message: result.message || result.error?.message || 'Error al enviar email',
    };
  }

  return { success: true };
}

export async function sendPasswordResetEmail(email: string, tempPassword: string): Promise<boolean> {
  const loginUrl = `${process.env.NEXTAUTH_URL || 'https://emitia.com.ar'}/login`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e40af;margin:0 0 16px;">Restablecimiento de contraseña — EMITIA</h2>
      <p style="color:#334155;line-height:1.6;">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p style="color:#334155;line-height:1.6;">Tu contraseña temporal es:</p>
      <p style="font-family:monospace;font-size:20px;font-weight:bold;background:#f1f5f9;padding:12px 16px;border-radius:8px;letter-spacing:2px;">${tempPassword}</p>
      <p style="color:#334155;line-height:1.6;">Ingresá con esta contraseña y cambiala desde tu perfil lo antes posible.</p>
      <p style="margin-top:24px;"><a href="${loginUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Iniciar sesión</a></p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">Si no solicitaste este cambio, contactá a soporte@emitia.com.ar</p>
    </div>
  `;

  const result = await sendSystemEmail({
    to: email,
    subject: 'Restablecimiento de contraseña — EMITIA',
    html,
  });

  return result.success;
}
