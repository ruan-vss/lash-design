import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { sendWhatsAppText } from './whatsappProvider.js';

const TEMPLATE_KEYS = new Set(['confirmation', 'reminder', 'preCare', 'cancellation', 'reschedule']);

export const renderWhatsAppTemplate = (template = '', values = {}) => String(template).replace(
  /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
  (_, key) => (values[key] === undefined || values[key] === null ? '' : String(values[key]))
);

const getBookingContext = async (bookingId) => {
  const { rows } = await query(
    `SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime", b.status,
            b.updated_at AS "updatedAt", c.full_name AS "clientName", c.phone AS "clientPhone",
            c.whatsapp_consent AS "whatsappConsent",
            STRING_AGG(bs.service_name_snapshot, ' + ' ORDER BY bs.service_name_snapshot) AS "serviceNames"
     FROM bookings b
     JOIN clients c ON c.id = b.client_id
     LEFT JOIN booking_services bs ON bs.booking_id = b.id
     WHERE b.id = $1
     GROUP BY b.id, c.id`,
    [bookingId]
  );
  return rows[0] || null;
};

const getSettings = async () => {
  const { rows } = await query(
    'SELECT whatsapp_enabled AS "enabled", whatsapp_templates AS templates FROM studio_settings WHERE id = 1'
  );
  return rows[0] || { enabled: false, templates: {} };
};

const truncate = (value, max = 1800) => String(value || '').slice(0, max);

export const whatsappService = {
  isConfigured: () => Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN),

  dispatchMessage: async ({ bookingId = null, recipientPhone, type, messageBody, eventKey = null }) => {
    const settings = await getSettings();
    if (!settings.enabled) return { sent: false, reason: 'Envio desabilitado nas configurações.' };

    if (eventKey) {
      const { rows: existing } = await query(
        `SELECT id, status, provider_message_id AS "providerMessageId"
         FROM notification_logs WHERE event_key = $1 LIMIT 1`,
        [eventKey]
      );
      if (existing[0]) {
        return {
          sent: existing[0].status === 'SENT',
          duplicate: true,
          status: existing[0].status,
          providerMessageId: existing[0].providerMessageId,
        };
      }
    }

    let status = 'FAILED';
    let errorDetail = null;
    let providerMessageId = null;

    if (!whatsappService.isConfigured()) {
      errorDetail = 'Credenciais da WhatsApp Cloud API ausentes no servidor.';
    } else {
      try {
        const provider = await sendWhatsAppText({
          recipientPhone,
          messageBody,
          config: {
            graphApiBase: env.WHATSAPP_GRAPH_API_BASE,
            graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION,
            phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
            accessToken: env.WHATSAPP_ACCESS_TOKEN,
            defaultCountryCode: env.WHATSAPP_DEFAULT_COUNTRY_CODE,
            requestTimeoutMs: env.WHATSAPP_REQUEST_TIMEOUT_MS,
          },
        });
        providerMessageId = provider.providerMessageId;
        status = 'SENT';
      } catch (error) {
        errorDetail = truncate(error.message);
      }
    }

    try {
      await query(
        `INSERT INTO notification_logs (
           booking_id, recipient_phone, type, message_body, status, attempts,
           error_detail, provider_message_id, event_key, sent_at
         ) VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,CASE WHEN $5 = 'SENT' THEN NOW() ELSE NULL END)
         ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING`,
        [bookingId, recipientPhone, type, messageBody, status, errorDetail, providerMessageId, eventKey]
      );
    } catch (logError) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'whatsapp_log_failed',
        bookingId,
        type,
        message: logError.message,
      }));
    }

    return { sent: status === 'SENT', status, errorDetail, providerMessageId };
  },

  sendBookingNotification: async ({ bookingId, templateKey, eventKey = null }) => {
    if (!TEMPLATE_KEYS.has(templateKey)) throw new Error('Template de WhatsApp inválido.');

    const [booking, settings] = await Promise.all([getBookingContext(bookingId), getSettings()]);
    if (!booking) return { sent: false, reason: 'Reserva não encontrada.' };
    if (!booking.whatsappConsent) return { sent: false, reason: 'Cliente não autorizou WhatsApp.' };
    if (!settings.enabled) return { sent: false, reason: 'Envio desabilitado nas configurações.' };

    const template = settings.templates?.[templateKey];
    if (!template) return { sent: false, reason: `Template ${templateKey} não configurado.` };

    const messageBody = renderWhatsAppTemplate(template, {
      cliente: booking.clientName,
      codigo: booking.code,
      servico: booking.serviceNames || 'atendimento',
      data: booking.date,
      hora: booking.startTime,
    });

    return whatsappService.dispatchMessage({
      bookingId,
      recipientPhone: booking.clientPhone,
      type: templateKey.toUpperCase(),
      messageBody,
      eventKey: eventKey || `${booking.id}:${templateKey}:${new Date(booking.updatedAt).toISOString()}`,
    });
  },
};
