import rateLimit from 'express-rate-limit';

const build = ({ windowMs, max, message }) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message },
});

// Consulta de disponibilidade (consulta ao banco por dia do mês: é a rota mais cara).
export const availabilityLimiter = build({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: 'Muitas consultas de horários. Aguarde alguns minutos.',
});

// Simulação de valores/cupom: impede enumeração de cupons.
export const previewLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Muitas simulações. Tente novamente em alguns minutos.',
});

// Criação de solicitação de reserva: impede ocupar a agenda em massa.
export const createBookingLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Limite de solicitações de reserva atingido. Tente novamente mais tarde.',
});

// Consulta por código+telefone e ações com token: impede tentativa de adivinhar códigos.
export const bookingAccessLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.',
});
