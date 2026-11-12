import crypto from 'crypto';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { extractWhatsAppStatuses, verifyMetaSignature } from '../utils/whatsappWebhook.js';

const ALLOWED_PROVIDER_STATUSES = new Set(['SENT', 'DELIVERED', 'READ', 'FAILED']);

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const hb = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export const whatsappWebhookController = {
  verify: (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (!env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(503).json({ message: 'Webhook de WhatsApp não configurado.' });
    }
    if (mode === 'subscribe' && safeEqual(token, env.WHATSAPP_VERIFY_TOKEN)) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  },

  receive: async (req, res, next) => {
    try {
      if (!env.WHATSAPP_APP_SECRET) {
        return res.status(503).json({ message: 'Webhook de WhatsApp não configurado (WHATSAPP_APP_SECRET ausente).' });
      }
      const validSignature = verifyMetaSignature({
        rawBody: req.rawBody,
        signatureHeader: req.get('x-hub-signature-256'),
        appSecret: env.WHATSAPP_APP_SECRET,
      });
      if (!validSignature) return res.status(401).json({ message: 'Assinatura do webhook inválida.' });

      const statuses = extractWhatsAppStatuses(req.body);
      for (const item of statuses) {
        if (!ALLOWED_PROVIDER_STATUSES.has(item.status)) continue;
        await query(
          `UPDATE notification_logs
           SET status = $2,
               error_detail = COALESCE($3, error_detail),
               sent_at = CASE WHEN $2 IN ('SENT','DELIVERED','READ') THEN COALESCE(sent_at, NOW()) ELSE sent_at END
           WHERE provider_message_id = $1`,
          [item.providerMessageId, item.status, item.errorDetail]
        );
      }

      return res.sendStatus(200);
    } catch (error) {
      return next(error);
    }
  },
};
