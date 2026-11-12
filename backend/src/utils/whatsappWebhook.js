import crypto from 'crypto';

export const verifyMetaSignature = ({ rawBody, signatureHeader, appSecret }) => {
  // Fail-closed: sem App Secret não há como autenticar a origem do webhook.
  if (!appSecret) return false;
  if (!rawBody || !signatureHeader?.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const received = String(signatureHeader);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

export const extractWhatsAppStatuses = (payload = {}) => {
  const statuses = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const status of change?.value?.statuses || []) {
        statuses.push({
          providerMessageId: status.id || null,
          status: String(status.status || '').toUpperCase(),
          recipientPhone: status.recipient_id || null,
          timestamp: status.timestamp || null,
          errorDetail: Array.isArray(status.errors) && status.errors.length
            ? status.errors.map((e) => e.title || e.message || e.code).filter(Boolean).join(' | ')
            : null,
        });
      }
    }
  }
  return statuses.filter((s) => s.providerMessageId && s.status);
};
