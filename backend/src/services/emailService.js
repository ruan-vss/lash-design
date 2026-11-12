import { env } from '../config/env.js';

const isConfigured = () => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && env.PASSWORD_RESET_URL);

const buildResetUrl = (token) => {
  const url = new URL(env.PASSWORD_RESET_URL || `${env.FRONTEND_URL}/admin/redefinir-senha`);
  url.searchParams.set('token', token);
  return url.toString();
};

export const emailService = {
  isConfigured,

  sendPasswordReset: async ({ to, token }) => {
    if (!isConfigured()) {
      return { sent: false, reason: 'EMAIL_NOT_CONFIGURED' };
    }

    const resetUrl = buildResetUrl(token);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject: 'Redefinição de senha — Lash Studio',
        html: `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetUrl}">Redefinir senha</a></p><p>Este link expira em 30 minutos e só pode ser usado uma vez.</p><p>Se você não solicitou a alteração, ignore esta mensagem.</p>`,
        text: `Redefina sua senha em: ${resetUrl}\n\nO link expira em 30 minutos e só pode ser usado uma vez.`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error('Falha ao enviar e-mail de recuperação.');
      error.statusCode = 502;
      error.internalDetail = detail.slice(0, 500);
      throw error;
    }

    const data = await response.json().catch(() => ({}));
    return { sent: true, providerMessageId: data.id || null };
  },
};
