import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTextPayload, sendWhatsAppText, toWhatsAppNumber } from '../src/services/whatsappProvider.js';

const config = {
  graphApiBase: 'https://graph.facebook.com',
  graphApiVersion: 'v22.0',
  phoneNumberId: '123456789',
  accessToken: 'token-de-teste-com-tamanho-suficiente',
  defaultCountryCode: '55',
  requestTimeoutMs: 5000,
};

test('normaliza telefone brasileiro para formato internacional', () => {
  assert.equal(toWhatsAppNumber('(11) 99999-8888', '55'), '5511999998888');
  assert.equal(toWhatsAppNumber('+55 11 99999-8888', '55'), '5511999998888');
});

test('monta payload textual oficial da Cloud API', () => {
  const payload = buildTextPayload({ recipientPhone: '(11) 99999-8888', messageBody: 'Olá!', defaultCountryCode: '55' });
  assert.deepEqual(payload, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '5511999998888',
    type: 'text',
    text: { preview_url: false, body: 'Olá!' },
  });
});

test('envia para endpoint oficial com bearer token e retorna message id', async () => {
  let captured;
  const fakeFetch = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.TESTE123' }] }),
    };
  };

  const result = await sendWhatsAppText({
    recipientPhone: '11999998888',
    messageBody: 'Teste',
    config,
    fetchImpl: fakeFetch,
  });

  assert.equal(captured.url, 'https://graph.facebook.com/v22.0/123456789/messages');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.Authorization, `Bearer ${config.accessToken}`);
  assert.equal(JSON.parse(captured.options.body).to, '5511999998888');
  assert.equal(result.providerMessageId, 'wamid.TESTE123');
});

test('propaga erro útil retornado pela Meta', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'Invalid parameter' } }),
  });

  await assert.rejects(
    () => sendWhatsAppText({ recipientPhone: '11999998888', messageBody: 'Teste', config, fetchImpl: fakeFetch }),
    /Invalid parameter/
  );
});
