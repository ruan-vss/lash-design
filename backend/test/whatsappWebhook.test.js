import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { extractWhatsAppStatuses, verifyMetaSignature } from '../src/utils/whatsappWebhook.js';

test('valida assinatura HMAC da Meta', () => {
  const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
  const secret = 'segredo-forte-de-teste';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  assert.equal(verifyMetaSignature({ rawBody, signatureHeader: signature, appSecret: secret }), true);
  assert.equal(verifyMetaSignature({ rawBody, signatureHeader: 'sha256=0000', appSecret: secret }), false);
});

test('rejeita webhook sem app secret (fail-closed)', () => {
  const rawBody = Buffer.from('{}');
  assert.equal(verifyMetaSignature({ rawBody, signatureHeader: 'sha256=abc', appSecret: '' }), false);
});

test('extrai atualizações de status do webhook', () => {
  const payload = {
    entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.1', status: 'delivered', recipient_id: '5511999998888' }] } }] }],
  };
  assert.deepEqual(extractWhatsAppStatuses(payload), [{
    providerMessageId: 'wamid.1', status: 'DELIVERED', recipientPhone: '5511999998888', timestamp: null, errorDetail: null,
  }]);
});
