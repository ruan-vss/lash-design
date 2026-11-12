export const toWhatsAppNumber = (phone = '', defaultCountryCode = '55') => {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(defaultCountryCode)) return digits;
  if (digits.length === 10 || digits.length === 11) return `${defaultCountryCode}${digits}`;
  return digits;
};

export const buildTextPayload = ({ recipientPhone, messageBody, defaultCountryCode = '55' }) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: toWhatsAppNumber(recipientPhone, defaultCountryCode),
  type: 'text',
  text: {
    preview_url: false,
    body: messageBody,
  },
});

export const sendWhatsAppText = async ({
  recipientPhone,
  messageBody,
  config,
  fetchImpl = globalThis.fetch,
}) => {
  if (!fetchImpl) throw new Error('Runtime sem suporte a fetch para chamar a WhatsApp Cloud API.');
  if (!config?.phoneNumberId || !config?.accessToken) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN não configurados.');
  }

  const payload = buildTextPayload({
    recipientPhone,
    messageBody,
    defaultCountryCode: config.defaultCountryCode || '55',
  });
  if (!payload.to) throw new Error('Telefone de destino inválido.');

  const base = String(config.graphApiBase || 'https://graph.facebook.com').replace(/\/$/, '');
  const version = config.graphApiVersion || 'v22.0';
  const endpoint = `${base}/${version}/${config.phoneNumberId}/messages`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.requestTimeoutMs || 10000),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message || `HTTP ${response.status}`;
    const err = new Error(`WhatsApp Cloud API recusou o envio: ${providerMessage}`);
    err.providerStatus = response.status;
    err.providerResponse = data;
    throw err;
  }

  return {
    providerMessageId: data?.messages?.[0]?.id || null,
    providerResponse: data,
  };
};
